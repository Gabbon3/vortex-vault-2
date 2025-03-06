import { SessionStorage } from "../utils/session.js";

export class ChatService {
    static initialize = false;
    static socket = null;
    /**
     * Stabilisce una connessione web socket con il server
     */
    static init() {
        if (this.initialize) return;
        // ---
        this.initialize = true;
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
            console.log(event);
        }
        this.socket.onclose = () => {
            console.log("❌ Connessione WebSocket chiusa");
        }
        this.socket.onerror = (error) => {
            console.error("❌ Errore WebSocket: ", error);
        }
    }
    /**
     * Invia un messaggio al server tramite WebSocket.
     * 
     * @param {string} receiver - UUID del destinatario 
     * @param {string} message - Il messaggio da inviare.
     */
    static sendMessage(message, receiver) {
        // Controlla se la connessione WebSocket è aperta
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const messageData = {
                receiver: receiver,
                message: message
            };

            this.socket.send(JSON.stringify(messageData));
            console.log(`✅ Messaggio inviato: ${message}`);
        } else {
            console.error("❌ Connessione WebSocket non aperta.");
        }
    }
}