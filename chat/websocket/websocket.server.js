import WebSocket, { WebSocketServer } from "ws";
import { SecureWebSocketServer } from "./secureWebSocketServer.js";

/**
 * Crea un WebSocket server in ascolto sulla 8080
 */
const wss = new WebSocketServer({ port: 8080, host: '0.0.0.0' });

wss.on("connection", (ws, req) => {
    SecureWebSocketServer.handleConnection(ws, req);
});

console.log("☑️ WebSocket");

export { wss };