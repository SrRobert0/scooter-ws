import { type WebSocket } from "ws";
import type { Server } from "socket.io";

let webSocketClients: Set<WebSocket> = new Set();
let socketIOInstance: Server | null = null;

export const initializeWebSocketService = (io: Server) => {
  socketIOInstance = io;
};

export const addWebSocketClient = (client: WebSocket): void => {
  webSocketClients.add(client);

  client.send(JSON.stringify({ server: "wss ok" }));

  client.on("close", () => {
    console.log("WS puro desconectado");
    webSocketClients.delete(client);
  });
};

export const removeWebSocketClient = (client: WebSocket): void => {
  webSocketClients.delete(client);
};

export const emitSocketIO = (event: string, data?: any): void => {
  if (socketIOInstance) {
    socketIOInstance.emit(event, data);
  }
};

export const broadcastWebSocket = (message: WebSocketMessage): void => {
  const messageStr = JSON.stringify(message);

  webSocketClients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(messageStr);
    }
  });
};

export const emitClientEvent = (
  eventType: "creation" | "update" | "delete" | "unlocking" | "ride" | "lock",
  scooterId?: string,
  data?: any
): void => {
  const baseEvent = `scooter_${eventType}`;

  if (scooterId && eventType !== "creation" && eventType !== "delete") {
    emitSocketIO(`${baseEvent}_${scooterId}`, data);
  } else {
    emitSocketIO(baseEvent, data);
  }
};

export const emitScooterEvent = (
  eventType: "scooter_unlocking" | "scooter_lock" | "scooter_ride",
  data: any
): void => {
  broadcastWebSocket({
    action: eventType,
    ...data,
  });
};

export const getConnectionStats = () => {
  return {
    webSocketClients: webSocketClients.size,
    socketIOClients: socketIOInstance?.engine.clientsCount || 0,
  };
};
