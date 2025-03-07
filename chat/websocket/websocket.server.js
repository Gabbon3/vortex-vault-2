import WebSocket, { WebSocketServer } from "ws";
import { handleConnection } from "./connection.handler.js";

/**
 * Crea un WebSocket server in ascolto sulla 8080
 */
const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws, req) => {
    handleConnection(ws, req);
});

console.log("☑️ WebSocket");

export { wss };