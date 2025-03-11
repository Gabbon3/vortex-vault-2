import { verify_access_token } from "../middlewares/auth.middleware.js";
import { DataRelayDispatcher } from "../services/dataRelayDispatcher.js";
import { rocksDb } from "../config/db.js";
import { ECDH } from "../../utils/ecdh.node.js";
import { v4 as uuidv4 } from "uuid";
import { AES256GCM } from "../../utils/aesgcm.js";
import msgpack from "../../public/utils/msgpack.min.js";
import { Config } from "../../server_config.js";

/**
 * Classe per la gestione delle connessioni WebSocket sicure.
 */
export class SecureWebSocketServer {
    static wsUrl = `${Config.HTTPROTOCOL}//${Config.WSORIGIN}`;
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
     * Mappa che indica quale web socket è usato da quale utente
     * @type {Map<string, string>}
     */
    static wsUserMap = new Map();

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
        ws.on("message", (data) =>
            SecureWebSocketServer.handleIncomingMessage(ws, data)
        );
        ws.on("close", () => {
            SecureWebSocketServer.clients.delete(ws.uuid);
            SecureWebSocketServer.wsUserMap.delete(ws.userUUID);
        });
    }

    /**
     * Gestisce l'handshake iniziale e deriva il segreto condiviso.
     * @param {WebSocket} ws - Connessione WebSocket.
     * @param {import('http').IncomingMessage} req - Richiesta HTTP.
     * @returns {boolean} - True se l'handshake è andato a buon fine, false altrimenti.
     */
    static performHandshake(ws, req) {
        // -- ottengo la chiave pubblica passata dal client
        const urlParams = new URL(req.url, this.wsUrl)
            .searchParams;
        const clientPublicKeyHex = urlParams.get("publickey");
        if (!clientPublicKeyHex) {
            ws.close();
            return false;
        }
        // -- genero un uuid unico per la connessione web socket
        ws.uuid = uuidv4();
        // -- questo parametro servirà a indicare se un web socket è stato verificato
        // - per abilitare la connessione va quindi verificato un access token
        ws.connectionVerified = false;
        // -- derivo il segreto condiviso con il client
        const clientPublicKey = Buffer.from(clientPublicKeyHex, "hex");
        const keyPair = ECDH.generate_keys();
        const sharedSecret = ECDH.derive_shared_secret(
            keyPair.private_key,
            clientPublicKey
        );
        // - memorizzo il segreto direttamente sul web socket dato che è associato solamente ad esso
        ws.secret = sharedSecret;
        /**
         * Metodo personalizzato per comunicare in maniera protetta
         * crittografando i dati in uscita con la chiave segreta condivisa del web socket
         * @param {*} data
         */
        ws.sendE = (data) => {
            const encodedData = msgpack.encode(data);
            const encryptedData = AES256GCM.encrypt(
                encodedData,
                ws.secret
            );
            ws.send(encryptedData.buffer);
        };
        /**
         * Metodo personalizzato per:
         * - chiudere la connessione con il client
         * - inviare un messaggio con la motivazione della chiusura
         * @param {number} code - codice di errore (usare i codici http)
         * @param {string} error - messaggio di errore
         */
        ws.closeWithError = (code, error) => {
            ws.send(JSON.stringify({ code, error }));
            ws.close();
        };
        // -- invio la chiave pubblica e lo UUID della connesssione al client
        ws.send(
            JSON.stringify({
                handShakePublicKey: keyPair.public_key.toString("hex"),
                handShakeWebSocketUUID: ws.uuid,
            })
        );
        // -- inserisco la connessione del client nelle pending, in attesa di validazione
        SecureWebSocketServer.pendingConnections.set(ws.uuid, ws);
        return true;
    }

    /**
     * Gestisce i messaggi in arrivo.
     * @param {WebSocket} ws - Connessione WebSocket.
     * @param {Buffer} encryptedData - Dati ricevuti, cifrati.
     */
    static async handleIncomingMessage(ws, encryptedData) {
        try {
            // # Decifratura Messaggio #
            // -- Quando la connessione è stabilita ogni dato sarà cifrato
            // - effettuo quindi la decifratura del dato web socket
            const decryptedData = SecureWebSocketServer.decryptMessage(
                ws.secret,
                encryptedData
            );
            // # Validazione Connessione #
            // -- devo validare la sessione web socket
            if (ws.connectionVerified === false) {
                return SecureWebSocketServer.validateConnection(
                    ws,
                    decryptedData.handShakeAccessToken
                );
            }
            // # Altri Messaggi #
            // -- se a questo punto la connessione web socket non è stata verificata
            // - la connessione verrà chiusa
            if (ws.connectionVerified === false) {
                ws.closeWithError(401, 'Unauthorized: invalid access token.');
                return;
            }
            // ## Gestione Dati ##
            SecureWebSocketServer.dataRelayDispatcher.handleData(
                decryptedData,
                SecureWebSocketServer.wsUserMap,
                SecureWebSocketServer.clients
            );
        } catch (error) {
            console.error(
                "❌ Errore nella gestione del messaggio WebSocket:",
                error
            );
        }
    }

    /**
     * Valida la connessione tramite Access Token
     * @param {WebSocket} ws - Connessione WebSocket.
     * @param {string} accessToken - Token di accesso fornito dal client.
     */
    static validateConnection(ws, accessToken) {
        const payload = verify_access_token(accessToken);
        if (!payload) {
            ws.closeWithError(401, "Unauthorized: invalid access token.");
            return;
        }
        // -- valido il web socket
        ws.connectionVerified = true;
        // -- memorizzo quale utente è connesso a questo web socket
        ws.userUUID = payload.uid;
        // -- sposto il web socket sui client verificati rimuovendolo da quelli in pending
        SecureWebSocketServer.pendingConnections.delete(ws.uuid);
        SecureWebSocketServer.clients.set(ws.uuid, ws);
        SecureWebSocketServer.wsUserMap.set(ws.userUUID, ws.uuid);
        // -- invio i dati inviati mentre era offline al client
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
