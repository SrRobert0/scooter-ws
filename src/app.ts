import { createServer } from "node:http";
import { Server } from "socket.io";
import { WebSocketServer } from "ws";
import expressApp from "./lib/express.js";
import { setupScooterRoutes } from "./routes/scooterRoutes.js";
import {
  setupWebSocket,
  setupSocketIO,
  handleWebSocketUpgrade,
} from "./websocket/setup.js";

// Configuração do servidor HTTP
const httpServer = createServer(expressApp);
const io = new Server(httpServer, { cors: { origin: "*" } });
const wss = new WebSocketServer({ noServer: true });

// Configuração das rotas
setupScooterRoutes(expressApp);

// Configuração do WebSocket
setupWebSocket(wss);
setupSocketIO(io);

// Handler para upgrade de conexão WebSocket
httpServer.on("upgrade", (request, socket, head) => {
  handleWebSocketUpgrade(wss, request, socket, head);
});

export default httpServer;
