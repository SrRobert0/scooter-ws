import express from "./lib/express";
import { createServer } from "node:http";
import { Server } from "socket.io";

const app = createServer(express);
const io = new Server(app, { cors: { origin: "*" } });

express.get("/status", (_, res) => {
  res.send("Servidor está funcionando!");
});

io.on("connection", (socket) => {
  console.log("Novo cliente conectado:", socket.id);

  io.emit("message", "Bem-vindo ao servidor Socket.io!");
});

export default app;
