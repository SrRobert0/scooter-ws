import { type WebSocket, WebSocketServer } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "socket.io";
import * as webSocketService from "../services/webSocketService";

export const setupWebSocket = (wss: WebSocketServer): void => {
  wss.on("connection", (ws: WebSocket) => {
    webSocketService.addWebSocketClient(ws);
  });
};

export const setupSocketIO = (io: Server): void => {
  webSocketService.initializeWebSocketService(io);

  io.on("connection", (socket) => {
    console.log("Novo cliente Socket.IO conectado:", socket.id);

    socket.on("disconnect", () => {
      console.log("Cliente Socket.IO desconectado:", socket.id);
    });
  });
};

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
