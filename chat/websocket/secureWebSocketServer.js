import { verify_access_token } from "../middlewares/auth.middleware.js";
import { DataRelayDispatcher } from "../services/dataRelayDispatcher.js";
import { rocksDb } from "../config/db.js";
import { ECDH } from "../../utils/ecdh.node.js";
import { v4 as uuidv4 } from "uuid";
import { AES256GCM } from "../../utils/aesgcm.js";
import msgpack from "../../public/utils/msgpack.min.js";

/**
 * Classe per la gestione delle connessioni WebSocket sicure.
 */
export class SecureWebSocketServer {
    /**
     * Mappa delle connessioni pendenti (in attesa di validazione).
     * @type {Map<string, WebSocket>}
     */
    static pendingConnections = new Map();

    /**
     * Mappa dei client connessi.
     * @type {Map<string, WebSocket>}
     */
    static clients = new Map();

    /**
     * Dispatcher per la gestione dei dati in attesa.
     */
    static dataRelayDispatcher = new DataRelayDispatcher(rocksDb);

    /**
     * Gestisce una nuova connessione WebSocket.
     * @param {WebSocket} ws - Connessione WebSocket dell'utente.
     * @param {import('http').IncomingMessage} req - Richiesta HTTP della connessione.
     */
    static async handleConnection(ws, req) {
        if (!SecureWebSocketServer.performHandshake(ws, req)) return;
        ws.on("message", (data) => SecureWebSocketServer.handleIncomingMessage(ws, data));
        ws.on("close", () => SecureWebSocketServer.clients.delete(ws.clientId));
    }

    /**
     * Gestisce l'handshake iniziale e deriva il segreto condiviso.
     * @param {WebSocket} ws - Connessione WebSocket.
     * @param {import('http').IncomingMessage} req - Richiesta HTTP.
     * @returns {boolean} - True se l'handshake è andato a buon fine, false altrimenti.
     */
    static performHandshake(ws, req) {
        const urlParams = new URL(req.url, `http://localhost:8080`).searchParams;
        const clientId = urlParams.get("uuid");
        const clientPublicKeyHex = urlParams.get("publickey");
        if (!clientId || !clientPublicKeyHex) {
            ws.close();
            return false;
        }

        ws.uuid = uuidv4();
        ws.clientId = clientId;
        const clientPublicKey = Buffer.from(clientPublicKeyHex, "hex");
        const keyPair = ECDH.generate_keys();
        const sharedSecret = ECDH.derive_shared_secret(keyPair.private_key, clientPublicKey);
        
        ws.secret = sharedSecret;
        /**
         * Metodo personalizzato per comunicare in maniera protetta
         * @param {*} data 
         */
        ws.sendE = (data) => {
            const encryptedData = AES256GCM.encrypt(msgpack.encode(data), ws.secret);
            ws.send(encryptedData.buffer);
        };

        ws.send(JSON.stringify({ handShakePublicKey: keyPair.public_key.toString("hex") }));
        SecureWebSocketServer.pendingConnections.set(clientId, ws);
        return true;
    }

    /**
     * Gestisce i messaggi in arrivo.
     * @param {WebSocket} ws - Connessione WebSocket.
     * @param {Buffer} encryptedData - Dati ricevuti, cifrati.
     */
    static async handleIncomingMessage(ws, encryptedData) {
        try {
            const decryptedData = SecureWebSocketServer.decryptMessage(ws.secret, encryptedData);
            if (decryptedData.handShakeAccessToken) {
                return SecureWebSocketServer.validateAccessToken(ws, decryptedData.handShakeAccessToken);
            }
            SecureWebSocketServer.dataRelayDispatcher.handleData(decryptedData, SecureWebSocketServer.clients);
        } catch (error) {
            console.error("❌ Errore nella gestione del messaggio WebSocket:", error);
        }
    }

    /**
     * Valida l'access token e autentica la connessione.
     * @param {WebSocket} ws - Connessione WebSocket.
     * @param {string} accessToken - Token di accesso fornito dal client.
     */
    static validateAccessToken(ws, accessToken) {
        const payload = verify_access_token(accessToken);
        if (!payload || payload.uid !== ws.clientId) {
            ws.close();
            return;
        }

        SecureWebSocketServer.pendingConnections.delete(ws.clientId);
        SecureWebSocketServer.clients.set(ws.clientId, ws);
        SecureWebSocketServer.dataRelayDispatcher.sendPendingData(ws);
    }

    /**
     * Decifra un messaggio ricevuto.
     * @param {Uint8Array} secret - Chiave segreta condivisa.
     * @param {Buffer} encryptedMessage - Messaggio cifrato.
     * @returns {Uint8Array} - Messaggio decifrato.
     */
    static decryptMessage(secret, encryptedMessage) {
        const messageBytes = new Uint8Array(encryptedMessage);
        const packed = AES256GCM.decrypt(messageBytes, secret);
        return msgpack.decode(packed);
    }
}