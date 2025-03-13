import WebSocket, { WebSocketServer } from "ws";
import { SecureWebSocketServer } from "./secureWebSocketServer.js";
import { webSocketG } from "./webSocketG.js";

/**
 * Crea un WebSocket server in ascolto sulla 8080
 */
const wss = new WebSocketServer({ host: '0.0.0.0', port: 8080 });

wss.on("connection", (ws, req) => {
    const wsg = webSocketG(ws);
    SecureWebSocketServer.handleConnection(wsg, req);
});

console.log("☑️ WebSocket");

export { wss };