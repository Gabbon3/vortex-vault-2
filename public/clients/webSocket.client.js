export class WebSocketClient {
    /**
     * Istanza di un client websocket
     * eventsHandler è un oggetto che racchiude funzioni per la gestione degli eventi
     * che riguardano i socket, gli eventi sono:
     *  - onmessage
     *  - onclose
     *  - onerror
     * @param {Object} eventsHandler 
     * @param {Function} dataPacker - funzione per impacchettare i dati prima di inviarli tramite web socket
     */
    constructor(eventsHandler, dataPacker) {
        this.initialize = false;
        this.socket = null;
        this.eventsHandler = eventsHandler;
        this.dataPacker = dataPacker ?? WebSocketClient.defaultDataPacker;
        // ---
        this.init();
    }
    /**
     * Stabilisce una connessione web socket con il server
     */
    init() {
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
     * Invia un messaggio web socket
     * @param {*} data - dati da inviare
     * @returns {boolean}
     */
    send(data) {
        try {
            this.socket.send(this.defaultDataPacker(data));
            return true;
        } catch (error) {
            console.warn("❌ Errore durante l'invio di un messaggio web socket:", error);
            return false;
        }
    }
    /**
     * 
     * @param {*} data 
     * @returns {string} 
     */
    static defaultDataPacker(data) {
        return JSON.stringify(data);
    }
}