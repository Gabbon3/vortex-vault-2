import { verify_access_token } from "../middlewares/auth.middleware.js";
import { MessageService } from "../services/message.service.js";
import { rocksDb } from "../config/db.js";
import { logger } from "../config/logger.js";

/**
 * Mappa degli utenti connessi
 * UUID utente -> WebSocket connection
 */
const clients = new Map();
const messageService = new MessageService(rocksDb);

/**
 * Gestisce una nuova connessione WebSocket.
 * @param {WebSocket} ws - Connessione WebSocket dell'utente
 * @param {import('http').IncomingMessage} req - Richiesta HTTP della connessione
 */
export const handleConnection = async (ws, req) => {
    // -- ottengo l'access token dai query params
    const urlParams = new URL(req.url, `http://localhost:8080`).searchParams;
    const token = urlParams.get("token");
    // -- verifico l'access token
    const payload = verify_access_token(token);
    if (payload === false) {
        ws.close();
        return;
    }
    const uid = payload.uid;
    // -- memorizzo il client
    clients.set(uid, ws);
    logger.info("Utente connesso: ", uid);
    // -- invio messaggi in attesa
    await messageService.sendPendingMessages(ws, uid);
    // -- gestisco l'arrivo dei messaggi
    ws.on('message', (data) => messageService.handleMessage(uid, data, clients));
    // -- chiudo la connessione ed elimino nella Map
    ws.on('close', () => clients.delete(uid));
};