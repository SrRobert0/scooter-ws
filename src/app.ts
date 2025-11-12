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
  lat: number;
  lon: number;
  displacement: number;
  onUse: boolean;
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
  clients.add(ws);

  ws.send(JSON.stringify({ server: "wss ok" }));

  // Ao receber algo de socket.io (do lado do servidor), repassa para WS
  // const forwardIo = (payload) => {
  //   if (ws.readyState === ws.OPEN) {
  //     ws.send(JSON.stringify(payload));
  //   }
  // };

  // io.on("mensagem_to_ws", forwardIo); // ajuste conforme sua lógica
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
  const { name, batteryLevel, lat, lon, displacement } = req.body;

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
    lat,
    lon,
    displacement,
    onUse: false,
    lastUpdate: new Date(),
  };

  scooters.push(newScooter);

  console.log("Novo patinete registrado:", newScooter.id);

  io.emit(`scooter_creation`);

  res.status(201).json(newScooter);
});

express.put("/scooters/:id", (req, res) => {
  const { id } = req.params;
  const { name, batteryLevel, onUse, lat, lon, displacement } = req.body;

  const scooterIndex = scooters.findIndex((s) => s.id === id);

  if (scooterIndex === -1 || !scooters[scooterIndex]) {
    return res.status(404).json({ error: "Patinete não encontrado" });
  }

  scooters[scooterIndex].name = name || scooters[scooterIndex].name;
  scooters[scooterIndex].batteryLevel =
    batteryLevel || scooters[scooterIndex].batteryLevel;
  scooters[scooterIndex].lat = lat || scooters[scooterIndex].lat;
  scooters[scooterIndex].lon = lon || scooters[scooterIndex].lon;
  scooters[scooterIndex].displacement =
    displacement || scooters[scooterIndex].displacement;
  scooters[scooterIndex].onUse = onUse || scooters[scooterIndex].onUse;
  scooters[scooterIndex].lastUpdate = new Date();

  io.emit(`scooter_update_${id}`);

  res.json(scooters[scooterIndex]);
});

express.post("/scooters/:id/unlock/:deviceId", (req, res) => {
  const { id, deviceId } = req.params;

  const scooterIndex = scooters.findIndex((s) => s.id === id);

  if (scooterIndex === -1 || !scooters[scooterIndex]) {
    return res.status(404).json({ error: "Patinete não encontrado" });
  }

  if (scooters[scooterIndex].onUse) {
    return res.status(400).json({ error: "Patinete já está em uso." });
  }

  scooters[scooterIndex].onUse = true;

  console.log(
    "Iniciando processo de desbloqueio para patinete:",
    scooters[scooterIndex].id
  );

  io.emit(`scooter_unlocking_${id}`, {
    ...scooters[scooterIndex],
    code: scooters[scooterIndex].id + " - " + deviceId,
  });

  for (const client of clients) {
    client.send(
      JSON.stringify({
        action: "scooter_unlocking",
        ...scooters[scooterIndex],
        code: scooters[scooterIndex].id + " - " + deviceId,
      })
    );
  }

  res.json({
    message: `Patinete ${scooters[scooterIndex].name}: Iniciando processo de desbloqueio.`,
  });
});

express.post("/scooters/:id/ride", (req, res) => {
  const { id } = req.params;
  const scooterIndex = scooters.findIndex((s) => s.id === id);

  if (scooterIndex === -1 || !scooters[scooterIndex]) {
    return res.status(404).json({ error: "Patinete não encontrado" });
  }

  console.log("Iniciando passeio para patinete:", scooters[scooterIndex].id);

  io.emit(`scooter_ride_${id}`, scooters[scooterIndex]);

  for (const client of clients) {
    client.send(
      JSON.stringify({
        action: "scooter_ride",
        ...scooters[scooterIndex],
      })
    );
  }

  res.json({
    message: `Patinete ${scooters[scooterIndex].name}: Desbloqueado para uso.`,
  });
});

express.post("/scooters/:id/lock", (req, res) => {
  const { id } = req.params;
  const scooterIndex = scooters.findIndex((s) => s.id === id);

  if (scooterIndex === -1 || !scooters[scooterIndex]) {
    return res.status(404).json({ error: "Patinete não encontrado" });
  }

  if (!scooters[scooterIndex].onUse) {
    return res.status(400).json({ error: "Patinete já está bloqueado." });
  }

  scooters[scooterIndex].onUse = false;

  console.log("Iniciando bloqueio para patinete:", scooters[scooterIndex].id);

  for (const client of clients) {
    client.send(
      JSON.stringify({
        action: "scooter_lock",
        ...scooters[scooterIndex],
      })
    );
  }

  res.json({
    message: `Patinete ${scooters[scooterIndex].name}: Bloqueado com sucesso.`,
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

  io.emit(`scooter_delete`);

  scooters.splice(scooterIndex, 1);
  res.json({
    message: `Patinete ${removedScooter.name} removido com sucesso.`,
  });
});

io.on("connection", (socket) => {
  console.log("Novo cliente conectado:", socket.id);
});

export default app;
