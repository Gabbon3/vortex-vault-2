import { WebSocketClient } from "../clients/webSocket.client.js";

export class ChatService {
    static initialize = false;
    static eventsHandler = {
        'onmessage': this.onmessage,
        'onclose': this.onclose,
        'onerror': this.onerror,
    };
    static client = null;
    /**
     * Stabilisce una connessione web socket con il server
     */
    static init() {
        if (this.initialize) return;
        // ---
        this.initialize = true;
        this.client = new WebSocketClient(this.eventsHandler);
    }
    /**
     * Invia un messaggio al server tramite WebSocket.
     * @param {string} receiver - UUID del destinatario 
     * @param {string} message - Il messaggio da inviare.
     */
    static sendMessage(message, receiver) {
        if (!this.client.socket || this.client.socket.readyState !== WebSocket.OPEN) {
            console.error("❌ Connessione WebSocket non aperta.");
            return false;
        }
        // ---
        const messageData = {
            type: 'msg',
            data: message
        };
        // ---
        return this.client.send(receiver, messageData);
    }
    /**
     * EVENTS HANDLERS
     */
    /**
     * Metodo invocato quando arriva un messaggio web socket
     * @param {*} data 
     */
    static onmessage(data) {
        console.log(data);
    }
    /**
     * Metodo invocato quando la connessione viene chiusa
     */
    static onclose() {
        console.log("❌ Connessione WebSocket chiusa");
    }
    /**
     * Metodo invocato all'errore del socket
     * @param {*} error 
     */
    static onerror(error) {
        console.error("❌ Errore WebSocket: ", error);
    }
}