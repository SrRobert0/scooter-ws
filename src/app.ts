import { v4 as randomUUID } from "uuid";
import express from "./lib/express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { type WebSocket, WebSocketServer } from "ws";

const app = createServer(express);
const io = new Server(app, { cors: { origin: "*" } });

type Scooter = {
  id: string;
  name: string;
  batteryLevel: number;
  lastUpdate?: Date;
};

const scooters: Scooter[] = [];

const wss = new WebSocketServer({ noServer: true });

const clients = new Set<WebSocket>();

app.on("upgrade", (request, socket, head) => {
  const { url } = request;
  if (url && url.startsWith("/ws")) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on("connection", (ws) => {
  console.log("WS puro conectado (ESP32 possível)");
  clients.add(ws);

  ws.send(JSON.stringify({ server: "wss ok" }));

  // Ao receber algo de um cliente WebSocket puro, repassa ao socket.io
  ws.on("message", (msg) => {
    console.log("WS msg:", msg.toString());
    // repassar aos clients socket.io (se quiser)
    io.emit("mensagem_from_ws", msg.toString());
  });

  // Ao receber algo de socket.io (do lado do servidor), repassa para WS
  const forwardIo = (payload) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  };

  io.on("mensagem_to_ws", forwardIo); // ajuste conforme sua lógica
  ws.on("close", () => {
    console.log("WS puro desconectado");
    // remover listeners se necessário
    clients.delete(ws);
  });
});

express.get("/status", (_, res) => {
  res.send("Servidor está funcionando!");
});

express.get("/scooters", (_, res) => {
  res.json(scooters);
});

express.get("/scooters/:id", (req, res) => {
  const { id } = req.params;
  const scooter = scooters.find((s) => s.id === id);

  if (!scooter) {
    return res.status(404).json({ error: "Patinete não encontrado" });
  }

  res.json(scooter);
});

express.post("/scooters/register", (req, res) => {
  const { name, batteryLevel } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Nome da scooter é obrigatório" });
  }

  if (batteryLevel === undefined || batteryLevel < 0 || batteryLevel > 100) {
    return res
      .status(400)
      .json({ error: "Nível de bateria inválido. Deve estar entre 0 e 100." });
  }

  const newScooter: Scooter = {
    id: randomUUID(),
    name,
    batteryLevel,
    lastUpdate: new Date(),
  };

  scooters.push(newScooter);

  console.log("Novo patinete registrado:", newScooter.id);

  res.status(201).json(newScooter);
});

express.put("/scooters/:id", (req, res) => {
  const { id } = req.params;
  const { name, batteryLevel } = req.body;

  const scooterIndex = scooters.findIndex((s) => s.id === id);

  if (scooterIndex === -1 || !scooters[scooterIndex]) {
    return res.status(404).json({ error: "Patinete não encontrado" });
  }

  scooters[scooterIndex].name = name || scooters[scooterIndex].name;
  scooters[scooterIndex].batteryLevel =
    batteryLevel || scooters[scooterIndex].batteryLevel;
  scooters[scooterIndex].lastUpdate = new Date();

  res.json(scooters[scooterIndex]);
});

express.post("/scooters/:id/unlock/:deviceId", (req, res) => {
  const { id, deviceId } = req.params;

  const scooter = scooters.find((s) => s.id === id);

  if (!scooter) {
    return res.status(404).json({ error: "Patinete não encontrado" });
  }

  console.log("Iniciando processo de desbloqueio para patinete:", scooter.id);

  io.emit(`scooter_unlocking_${scooter.id}`, {
    ...scooter,
    code: scooter.id + " - " + deviceId,
  });

  for (const client of clients) {
    client.send(
      JSON.stringify({
        action: "scooter_unlocking",
        ...scooter,
        code: scooter.id + " - " + deviceId,
      })
    );
  }

  res.json({
    message: `Patinete ${scooter.name}: Iniciando processo de desbloqueio.`,
  });
});

express.post("/scooters/:id/ride", (req, res) => {
  const { id } = req.params;
  const scooter = scooters.find((s) => s.id === id);

  if (!scooter) {
    return res.status(404).json({ error: "Patinete não encontrado" });
  }

  console.log("Iniciando passeio para patinete:", scooter.id);

  io.emit(`scooter_ride_${scooter.id}`, scooter);

  for (const client of clients) {
    client.send(
      JSON.stringify({
        action: "scooter_ride",
        ...scooter,
      })
    );
  }

  res.json({
    message: `Patinete ${scooter.name}: Desbloqueado para uso.`,
  });
});

express.post("/scooters/:id/lock", (req, res) => {
  const { id } = req.params;
  const scooter = scooters.find((s) => s.id === id);

  if (!scooter) {
    return res.status(404).json({ error: "Patinete não encontrado" });
  }

  console.log("Iniciando bloqueio para patinete:", scooter.id);

  io.emit(`scooter_lock_${scooter.id}`, scooter);

  for (const client of clients) {
    client.send(
      JSON.stringify({
        action: "scooter_lock",
        ...scooter,
      })
    );
  }

  res.json({
    message: `Patinete ${scooter.name}: Bloqueado com sucesso.`,
  });
});

express.delete("/scooters/:id", (req, res) => {
  const { id } = req.params;
  const scooterIndex = scooters.findIndex((s) => s.id === id);

  if (scooterIndex === -1 || !scooters[scooterIndex]) {
    return res.status(404).json({ error: "Patinete não encontrado" });
  }

  const removedScooter = scooters[scooterIndex];

  console.log("Removendo patinete:", removedScooter.id);

  scooters.splice(scooterIndex, 1);
  res.json({
    message: `Patinete ${removedScooter.name} removido com sucesso.`,
  });
});

io.on("connection", (socket) => {
  console.log("Novo cliente conectado:", socket.id);
});

export default app;
