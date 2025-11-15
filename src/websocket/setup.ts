import { type WebSocket, WebSocketServer } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "socket.io";
import * as webSocketService from "../services/webSocketService";

/**
 * Configura o WebSocket Server
 */
export const setupWebSocket = (wss: WebSocketServer): void => {
  wss.on("connection", (ws: WebSocket) => {
    webSocketService.addWebSocketClient(ws);
  });
};

/**
 * Configura o Socket.IO
 */
export const setupSocketIO = (io: Server): void => {
  // Inicializa o serviço WebSocket com instância do Socket.IO
  webSocketService.initializeWebSocketService(io);

  io.on("connection", (socket) => {
    console.log("Novo cliente Socket.IO conectado:", socket.id);

    socket.on("disconnect", () => {
      console.log("Cliente Socket.IO desconectado:", socket.id);
    });
  });
};

/**
 * Handler para upgrade de conexão WebSocket
 */
export const handleWebSocketUpgrade = (
  wss: WebSocketServer,
  request: IncomingMessage,
  socket: any,
  head: Buffer
): void => {
  const { url } = request;

  if (url && url.startsWith("/ws")) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
};
