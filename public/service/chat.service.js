import { SessionStorage } from "../utils/session.js";
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
        const uid = SessionStorage.get('uid');
        const accessToken = SessionStorage.get('access-token');
        if (!uid) return false;
        // ---
        this.socket = new WebSocket(`ws://localhost:8080?token=${accessToken}`);
        // ---
        this.socket.onopen = () => {
            console.log("✅ Connessione WebSocket aperta");
        }
        // ---
        this.events();
    }
    /**
     * Gestione eventi con il web server
     */
    static events() {
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            // ---
            const eventType = data.shift();
            console.log(eventType, data);
        }
        this.socket.onclose = () => {
        }
        this.socket.onerror = (error) => {
        }
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
            receiver: receiver,
            data: message
        };
        // ---
        return this.client.send(messageData);
    }
    /**
     * EVENTS HANDLERS
     */
    /**
     * Metodo invocato quando arriva un messaggio web socket
     * @param {*} event 
     */
    static onmessage(event) {
        const data = JSON.parse(event.data);
        // ---
        const eventType = data.shift();
        console.log(eventType, data);
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