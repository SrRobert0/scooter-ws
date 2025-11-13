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
  unlockAttempt?:
    | {
        deviceId: string;
        timestamp: Date;
        timerId?: NodeJS.Timeout;
      }
    | undefined;
};

const scooters: Scooter[] = [];

// Função para preparar dados do patinete para serialização JSON (remove timerId)
const prepareScooterForJSON = (scooter: Scooter) => {
  return {
    ...scooter,
    unlockAttempt: scooter.unlockAttempt
      ? {
          deviceId: scooter.unlockAttempt.deviceId,
          timestamp: scooter.unlockAttempt.timestamp,
          // Remove timerId para evitar referências circulares
        }
      : undefined,
  };
};

// Função para desbloquear automaticamente o patinete após 3 minutos
const autoUnlockScooter = (scooterId: string, deviceId: string) => {
  const scooterIndex = scooters.findIndex((s) => s.id === scooterId);

  if (scooterIndex === -1 || !scooters[scooterIndex]) {
    console.log(
      "Patinete não encontrado para desbloqueio automático:",
      scooterId
    );
    return;
  }

  const scooter = scooters[scooterIndex];

  // Verifica se ainda há tentativa de desbloqueio pendente
  if (!scooter.unlockAttempt || scooter.unlockAttempt.deviceId !== deviceId) {
    console.log(
      "Tentativa de desbloqueio não encontrada ou já processada:",
      scooterId
    );
    return;
  }

  // Verifica se o patinete ainda não foi desbloqueado manualmente
  if (scooter.onUse) {
    console.log("Desbloqueio automático executado para patinete:", scooterId);

    // Remove a tentativa de desbloqueio e libera o patinete
    scooter.unlockAttempt = undefined;
    scooter.onUse = false; // Libera o patinete para uso novamente
    scooter.lastUpdate = new Date();

    // Emite evento de atualização do patinete
    io.emit(`scooter_update`);
    io.emit(`scooter_update_${scooterId}`);

    // Emite evento via WebSocket
    for (const client of clients) {
      client.send(
        JSON.stringify({
          action: "scooter_auto_unlock_timeout",
          ...prepareScooterForJSON(scooter),
          message:
            "Patinete liberado automaticamente após 3 minutos - tentativa de desbloqueio expirou",
        })
      );
    }

    console.log(
      `Patinete ${scooter.name} foi liberado automaticamente após timeout de desbloqueio`
    );
  } else {
    // Remove a tentativa de desbloqueio se o patinete já foi desbloqueado
    scooter.unlockAttempt = undefined;
    console.log("Patinete já foi desbloqueado manualmente:", scooterId);
  }

  // Atualiza o patinete na lista
  scooters[scooterIndex] = scooter;
};

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
  const cleanScooters = scooters.map(prepareScooterForJSON);
  res.json(cleanScooters);
});

express.get("/scooters/:id", (req, res) => {
  const { id } = req.params;
  const scooter = scooters.find((s) => s.id === id);

  if (!scooter) {
    return res.status(404).json({ error: "Patinete não encontrado" });
  }

  // Adiciona informações sobre tentativa de desbloqueio sem expor o timerId
  const responseScooter = {
    ...scooter,
    unlockAttempt: scooter.unlockAttempt
      ? {
          deviceId: scooter.unlockAttempt.deviceId,
          timestamp: scooter.unlockAttempt.timestamp,
          timeRemaining: scooter.unlockAttempt.timerId
            ? Math.max(
                0,
                180000 -
                  (Date.now() - scooter.unlockAttempt.timestamp.getTime())
              )
            : 0,
        }
      : undefined,
  };

  res.json(responseScooter);
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

  console.log("Atualizando patinete:", id);

  const scooterIndex = scooters.findIndex((s) => s.id === id);

  if (scooterIndex === -1 || !scooters[scooterIndex]) {
    console.log("Patinete não encontrado para atualização:", id);
    return res.status(404).json({ error: "Patinete não encontrado" });
  }

  scooters[scooterIndex].name = name || scooters[scooterIndex].name;
  scooters[scooterIndex].batteryLevel =
    batteryLevel || scooters[scooterIndex].batteryLevel;
  scooters[scooterIndex].lat = lat || scooters[scooterIndex].lat;
  scooters[scooterIndex].lon = lon || scooters[scooterIndex].lon;
  scooters[scooterIndex].displacement =
    displacement || scooters[scooterIndex].displacement;
  scooters[scooterIndex].onUse =
    onUse === undefined || scooters[scooterIndex].onUse;
  scooters[scooterIndex].lastUpdate = new Date();

  io.emit(`scooter_update`);
  io.emit(`scooter_update_${id}`);

  res.json(prepareScooterForJSON(scooters[scooterIndex]));
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

  // Cancela timer anterior se existir
  if (scooters[scooterIndex].unlockAttempt?.timerId) {
    clearTimeout(scooters[scooterIndex].unlockAttempt!.timerId);
  }

  // Configura a tentativa de desbloqueio com timer de 3 minutos
  const timerId = setTimeout(() => {
    autoUnlockScooter(id, deviceId);
  }, 3 * 60 * 1000); // 3 minutos em milissegundos

  scooters[scooterIndex].unlockAttempt = {
    deviceId,
    timestamp: new Date(),
    timerId,
  };

  scooters[scooterIndex].onUse = true;

  console.log(
    "Iniciando processo de desbloqueio para patinete:",
    scooters[scooterIndex].id,
    "- Timer de 3 minutos ativado"
  );

  io.emit(`scooter_unlocking_${id}`, {
    ...prepareScooterForJSON(scooters[scooterIndex]),
    code: scooters[scooterIndex].id + " - " + deviceId,
  });
  io.emit(`scooter_update`);

  for (const client of clients) {
    client.send(
      JSON.stringify({
        action: "scooter_unlocking",
        ...prepareScooterForJSON(scooters[scooterIndex]),
        code: scooters[scooterIndex].id + " - " + deviceId,
      })
    );
  }

  res.json({
    message: `Patinete ${scooters[scooterIndex].name}: Iniciando processo de desbloqueio.`,
    autoUnlockIn: "3 minutos",
  });
});

express.post("/scooters/:id/ride", (req, res) => {
  const { id } = req.params;
  const scooterIndex = scooters.findIndex((s) => s.id === id);

  if (scooterIndex === -1 || !scooters[scooterIndex]) {
    return res.status(404).json({ error: "Patinete não encontrado" });
  }

  // Cancela o timer de desbloqueio automático se existir
  if (scooters[scooterIndex].unlockAttempt?.timerId) {
    clearTimeout(scooters[scooterIndex].unlockAttempt.timerId);
    scooters[scooterIndex].unlockAttempt = undefined;
  }

  console.log("Iniciando passeio para patinete:", scooters[scooterIndex].id);

  io.emit(`scooter_ride_${id}`, prepareScooterForJSON(scooters[scooterIndex]));

  for (const client of clients) {
    client.send(
      JSON.stringify({
        action: "scooter_ride",
        ...prepareScooterForJSON(scooters[scooterIndex]),
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

  // Cancela o timer de desbloqueio automático se existir
  if (scooters[scooterIndex].unlockAttempt?.timerId) {
    clearTimeout(scooters[scooterIndex].unlockAttempt.timerId);
    scooters[scooterIndex].unlockAttempt = undefined;
  }

  scooters[scooterIndex].onUse = false;

  console.log("Iniciando bloqueio para patinete:", scooters[scooterIndex].id);

  for (const client of clients) {
    client.send(
      JSON.stringify({
        action: "scooter_lock",
        ...prepareScooterForJSON(scooters[scooterIndex]),
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
  console.log("Novo client conectado:", socket.id);
});

export default app;
