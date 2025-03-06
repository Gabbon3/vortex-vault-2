import WebSocket, { WebSocketServer } from "ws";
import { handleConnection } from "./connection.handler.js";

/**
 * Crea un WebSocket server in ascolto sulla 8080
 */
const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws, req) => {
    handleConnection(ws, req);
});

console.log("🚀 WebSocket Server in ascolto su ws://localhost:8080");

export { wss };