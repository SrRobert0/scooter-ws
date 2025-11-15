import { type WebSocket } from "ws";
import type { Server } from "socket.io";
import type { WebSocketMessage } from "../types/api";

// Estado global dos clientes WebSocket
let webSocketClients: Set<WebSocket> = new Set();
let socketIOInstance: Server | null = null;

/**
 * Inicializa o serviço WebSocket
 */
export const initializeWebSocketService = (io: Server) => {
  socketIOInstance = io;
};

/**
 * Adiciona um cliente WebSocket
 */
export const addWebSocketClient = (client: WebSocket): void => {
  webSocketClients.add(client);

  // Envia mensagem de boas-vindas
  client.send(JSON.stringify({ server: "wss ok" }));

  // Configura handler para desconexão
  client.on("close", () => {
    console.log("WS puro desconectado");
    webSocketClients.delete(client);
  });
};

/**
 * Remove um cliente WebSocket
 */
export const removeWebSocketClient = (client: WebSocket): void => {
  webSocketClients.delete(client);
};

/**
 * Envia mensagem via Socket.IO
 */
export const emitSocketIO = (event: string, data?: any): void => {
  if (socketIOInstance) {
    socketIOInstance.emit(event, data);
  }
};

/**
 * Envia mensagem para todos os clientes WebSocket
 */
export const broadcastWebSocket = (message: WebSocketMessage): void => {
  const messageStr = JSON.stringify(message);

  webSocketClients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(messageStr);
    }
  });
};

/**
 * Envia evento de patinete para todos os clientes
 */
export const emitScooterEvent = (
  eventType:
    | "creation"
    | "update"
    | "delete"
    | "unlocking"
    | "ride"
    | "lock"
    | "auto_unlock_timeout",
  scooterId?: string,
  data?: any
): void => {
  const baseEvent = `scooter_${eventType}`;

  // Socket.IO - Evento geral
  emitSocketIO(baseEvent, data);

  // Socket.IO - Evento específico se tiver ID
  if (scooterId && eventType !== "creation" && eventType !== "delete") {
    emitSocketIO(`${baseEvent}_${scooterId}`, data);
  }

  // WebSocket
  const wsAction =
    eventType === "auto_unlock_timeout"
      ? "scooter_auto_unlock_timeout"
      : `scooter_${eventType}`;
  broadcastWebSocket({
    action: wsAction,
    ...data,
  });
};

/**
 * Obtém estatísticas dos clientes conectados
 */
export const getConnectionStats = () => {
  return {
    webSocketClients: webSocketClients.size,
    socketIOClients: socketIOInstance?.engine.clientsCount || 0,
  };
};
