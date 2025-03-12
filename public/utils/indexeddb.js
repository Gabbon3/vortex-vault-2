/**
 * Classe wrapper per operazioni su IndexedDB.
 */
export class IndexedDb {
    /**
     * Costruttore.
     * @param {string} dbName - Il nome del database.
     * @param {string} storeName - Il nome dell'object store.
     * @param {boolean} [init=true] - se true, inizializza subito l'istanza, se no, init() va richiamato manualmente
     */
    constructor(dbName, storeName, keyConfig = null, init = true) {
        // -- Inizializzo il nome del database e dell'object store.
        this.dbName = dbName;
        this.storeName = storeName;
        this.db = null;
        this.keyConfig = keyConfig ?? {
            keyPath: "id",
            // autoIncrement: true,
        };
        if (init) this.init();
    }

    /**
     * Inizializza il database creando lo store se non esiste.
     * @returns {Promise<boolean>} True se l'inizializzazione ha avuto successo.
     */
    async init() {
        if (this.db) return true;
        return new Promise((resolve, reject) => {
            // -- Apro il database con la versione 1.
            const request = indexedDB.open(this.dbName, 1);

            request.onupgradeneeded = (event) => {
                // -- Creo lo store se non esiste.
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, this.keyConfig);
                }
            };

            request.onsuccess = (event) => {
                // -- Salvo il riferimento al database.
                this.db = event.target.result;
                resolve(true);
            };

            request.onerror = (event) => {
                console.warn(event.target.error);
                resolve(false);
            };
        });
    }

    /**
     * Elimina completamente il database.
     * @returns {Promise<boolean>} True se l'eliminazione ha avuto successo.
     */
    async deleteDatabase() {
        if (this.db) {
            this.db.close();
        }
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(this.dbName);
            request.onsuccess = () => resolve(true);
            request.onerror = () => resolve(false);
            request.onblocked = () => resolve(false);
        });
    }

    /**
     * Esegue una transazione sul database.
     * @param {string} operation - "post", "get", "getAll", "put", "delete", "clear"
     * @param {Object|number} [data] - I dati da usare (o la chiave per get/delete).
     * @returns {Promise<boolean|Array|Object>} Il risultato della transazione.
     */
    async transaction(operation, data) {
        if (this.db === null) throw new Error("DB not initialized");

        // -- Determino la modalità della transazione: readwrite per post, put, delete, clear; readonly per get, getAll.
        const mode = ["post", "put", "delete", "clear"].includes(operation)
            ? "readwrite"
            : "readonly";

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(this.storeName, mode);
            const store = transaction.objectStore(this.storeName);
            let request;

            // -- Seleziono l'operazione da eseguire.
            switch (operation) {
                case "post":
                    request = store.add(data);
                    break;
                case "get":
                    request = store.get(data);
                    break;
                case "getAll":
                    request = store.getAll();
                    break;
                case "put":
                    request = store.put(data);
                    break;
                case "delete":
                    request = store.delete(data);
                    break;
                case "clear":
                    request = store.clear();
                    break;
                default:
                    reject(new Error("Invalid operation"));
                    return;
            }

            request.onsuccess = (event) => {
                // -- Risolvo con il risultato per get e getAll, altrimenti true.
                if (operation === "get" || operation === "getAll") {
                    resolve(event.target.result || false);
                } else {
                    resolve(true);
                }
            };

            request.onerror = (event) => {
                console.warn(event.target.error);
                resolve(false);
            };
        });
    }

    /**
     * Inserisce un nuovo elemento nel database.
     * @param {Object} data - I dati da inserire.
     * @returns {Promise<boolean>} True se l'inserimento ha avuto successo.
     */
    async insert(data) {
        // -- Eseguo l'inserimento dei dati.
        return await this.transaction("post", data);
    }

    /**
     * Aggiorna un elemento esistente.
     * @param {number} id - L'identificatore dell'elemento.
     * @param {Object} data - I nuovi dati da aggiornare.
     * @returns {Promise<boolean>} True se l'aggiornamento ha avuto successo.
     */
    async update(id, data) {
        // -- Eseguo l'aggiornamento, combinando l'id con i nuovi dati.
        return await this.transaction("put", { id, ...data });
    }

    /**
     * Elimina un elemento.
     * @param {number} id - L'identificatore dell'elemento da eliminare.
     * @returns {Promise<boolean>} True se l'eliminazione ha avuto successo.
     */
    async delete(id) {
        // -- Eseguo la cancellazione dell'elemento.
        return await this.transaction("delete", id);
    }

    /**
     * Ottiene un elemento.
     * @param {number} id - L'identificatore dell'elemento da ottenere.
     * @returns {Promise<boolean|Object>} L'elemento trovato o false se non esiste.
     */
    async get(id) {
        // -- Eseguo il recupero dell'elemento per id.
        return await this.transaction("get", id);
    }

    /**
     * Ottiene tutti gli elementi.
     * @returns {Promise<Array>} Un array di tutti gli elementi.
     */
    async getAll() {
        // -- Eseguo il recupero di tutti gli elementi.
        return await this.transaction("getAll");
    }

    /**
     * Elimina tutti gli elementi dallo store.
     * @returns {Promise<boolean>} True se lo store è stato svuotato con successo.
     */
    async clearStore() {
        // -- Eseguo la cancellazione di tutti gli elementi dallo store.
        return await this.transaction("clear");
    }
}