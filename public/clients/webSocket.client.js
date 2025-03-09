import { AES256GCM } from "../secure/aesgcm.js";
import { ECDH } from "../secure/ecdh.js";
import { Bytes } from "../utils/bytes.js";
import { Log } from "../utils/log.js";
import msgpack from "../utils/msgpack.min.js";
import { SessionStorage } from "../utils/session.js";

export class WebSocketClient {
    /**
     * Istanza di un client websocket
     * eventsHandler è un oggetto che racchiude funzioni per la gestione degli eventi
     * che riguardano i socket, gli eventi sono:
     *  - onmessage
     *  - onclose
     *  - onerror
     * @param {Object} eventsHandler
     */
    constructor(eventsHandler) {
        this.ID = null;
        this.initialize = false;
        this.handShakeCompleted = false;
        this.socket = null;
        this.eventsHandler = eventsHandler;
        // -- Gestione delle chiavi e segreti
        this.clientPrivateKey = null;
        this.clientPublicKey = null;
        this.clientPublicKeyHex = null;
        this.sharedSecret = null;
        this.serverPublicKey = null;
        // -- Inizializzazione
        this.init();
    }
    /**
     * Stabilisce una connessione web socket con il server
     */
    async init() {
        if (this.initialize) return;
        this.initialize = true;
        // ---
        await this.generateKeyPair();
        // ---
        const url = `ws://localhost:8080?publickey=${this.clientPublicKeyHex}`;
        this.socket = new WebSocket(url);
        // ---
        this.socket.onopen = () => {
            console.log("✅ Connessione WebSocket aperta");
        };
        // ---
        this.events();
    }
    /**
     * Gestisce gli eventi del socket
     */
    events() {
        this.socket.onmessage = async (event) => {
            // -- verifico se è un errore, in modo da mostrarlo all'utente
            if (this.isError(event.data)) return;
            // -- se l'handShake è stato completato non c'è piu bisogno di terminarlo
            // - derivando il segreto condiviso della connessione
            if (this.handShakeCompleted === false) {
                const wasHandShake = await this.deriveSharedSecret(event);
                if (wasHandShake === true) return;
            }
            // -- tutti i messaggi sono in Blob, li converto in Uint8Array
            const binary = await this.convertBlob(event.data);
            // -- decifro data
            const decryptedData = await AES256GCM.decrypt(binary, this.sharedSecret);
            const decoded = msgpack.decode(decryptedData);
            this.eventsHandler.onmessage(decoded);
        };
        this.socket.onclose = (event) => {
            this.eventsHandler.onclose(event);
        };
        this.socket.onerror = (error) => {
            this.eventsHandler.onerror(error);
        };
    }
    /**
     * Converte i dati binari blob in uint8array se ce ne bisogno
     * @param {Blob | *} data 
     * @returns {Uint8Array | *}
     */
    async convertBlob(data) {
        if (data instanceof Blob === false) return data;
        // ---
        const arrayBuffer = await data.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        return uint8Array;
    }
    /**
     * Verifica se il messaggio in arrivo è un errore
     * @param {string} data 
     * @returns {boolean}
     */
    isError(data) {
        try {
            const { code, error } = JSON.parse(data);
            if (!code || !error) return false;
            // -- mostro all'utente l'errore
            console.error('Errore con la connessione web socket:', { code, error });
            Log.summon(2, `${code} - ${error}`);
            return true;
        } catch (err) {
            return false;
        }
    }
    /**
     * Invia un messaggio web socket
     * @param {string} recipientID - id destinazione del messaggio (a chi)
     * @param {*} data - dati da inviare
     * @returns {boolean}
     */
    async send(recipientID, data) {
        try {
            const prepare = {
                recipientID,
                data,
            };
            const encoded = msgpack.encode(prepare);
            // -- cifro
            const encryptedMessage = await AES256GCM.encrypt(encoded, this.sharedSecret);
            // ---
            this.socket.send(encryptedMessage);
            return true;
        } catch (error) {
            console.warn(
                "❌ Errore durante l'invio di un messaggio web socket:",
                error
            );
            return false;
        }
    }
    /**
     * Genera e imposta le chiavi da usare per l'handshake con il server
     * @returns {boolean}
     */
    async generateKeyPair() {
        const keyPair = await ECDH.generate_keys();
        // ---
        this.clientPrivateKey = keyPair.private_key[0];
        // -
        this.clientPublicKey = keyPair.public_key[0];
        this.clientPublicKeyHex = Bytes.hex.encode(keyPair.public_key[1]);
        // ---
        return true;
    }
    /**
     * Deriva e imposta il segreto comune tra client e server
     * Completa la connessione inviando l'access token relativo
     * @param {*} event
     * @returns {boolean}
     */
    async deriveSharedSecret(event) {
        try {
            JSON.parse(event.data)
        } catch (error) {
            return null;
        }
        try {
            const data = JSON.parse(event.data);
            // -- il messaggio potrebbe non essere quello della chiave pubblica
            // -- questo messaggio deve contenere:
            // - "handShakePublicKey" ->
            // - "handShakeWebSocketUUID" -> uuid della connessione websocket
            // -- corrisponde alla prima fase di handshake per il server
            if (!data.handShakePublicKey || !data.handShakeWebSocketUUID) return false;
            // -- memorizzo lo uuid del web socket generato dal server
            this.ID = data.handShakeWebSocketUUID;
            // -- ottengo la chiave pubblica del server
            const { handShakePublicKey } = data;
            this.serverPublicKey = await ECDH.import_public_key(
                Bytes.hex.decode(handShakePublicKey)
            );
            // -- calcolo il segreto
            this.sharedSecret = await ECDH.derive_shared_secret(
                this.clientPrivateKey,
                this.serverPublicKey
            );
            // -- completo la connessione
            await this.completeHandShake();
            // ---
            return true;
        } catch (error) {
            console.warn(
                "❌ Errore durante il calcolo del segreto comune:",
                error
            );
            return null;
        }
    }
    /**
     * Cifra e invia l'access token al server, abilitando la connessione con il server
     * sempre se l'access token è valido
     * @returns {boolean}
     */
    async completeHandShake() {
        const accessToken = SessionStorage.get("access-token");
        if (!accessToken) return false;
        // ---
        const packedMessage = msgpack.encode({ handShakeAccessToken: accessToken });
        const encryptedMessage = await AES256GCM.encrypt(
            packedMessage,
            this.sharedSecret
        );
        // -- invio l'access token al server
        this.socket.send(encryptedMessage);
        this.handShakeCompleted = true;
        return true;
    }
}
