export class IndexedDb {
    constructor(dbName = "chatDB") {
        this.dbName = dbName;
        this.db = null;
    }

    /**
     * Inizializza il database.
     * @returns {Promise<boolean>}
     */
    async init() {
        if (this.db) return true;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log("Upgrade: Controllo esistenza store...");
            };

            request.onsuccess = (event) => {
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
     * Crea dinamicamente uno store se non esiste
     * @param {string} storeName - Il nome dello store (UUID della chat)
     * @returns {Promise<boolean>}
     */
    async createStore(storeName) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.db.version + 1);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: "id" });
                }
            };
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(true);
            };
            request.onerror = (event) => resolve(false);
        });
    }

    /**
     * Elimina uno store dal database.
     * @param {string} storeName - Nome dello store da eliminare (UUID della chat).
     * @returns {Promise<boolean>}
     */
    async deleteStore(storeName) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.db.version + 1);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (db.objectStoreNames.contains(storeName)) {
                    db.deleteObjectStore(storeName);
                    console.log(`🗑️ Store ${storeName} eliminato.`);
                }
            };
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(true);
            };
            request.onerror = (event) => {
                console.warn(`❌ Errore nell'eliminazione dello store ${storeName}`);
                resolve(false);
            };
        });
    }

    /**
     * Esegue una transazione sullo store specificato.
     * @param {string} storeName - Nome dello store (UUID della chat).
     * @param {string} operation - Tipo di operazione ("post", "get", "getAll", "put", "delete", "clear").
     * @param {Object|number} [data] - Dati da inserire/eliminare/recuperare.
     * @returns {Promise<boolean|Array|Object>}
     */
    async transaction(storeName, operation, data) {
        if (this.db === null) throw new Error("DB not initialized");

        const mode = ["post", "put", "delete", "clear"].includes(operation) ? "readwrite" : "readonly";

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            let request;

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
     * Inserisce un nuovo messaggio nello store specificato.
     * @param {string} storeName - Nome dello store (UUID della chat).
     * @param {Object} data - Dati del messaggio.
     * @returns {Promise<boolean>}
     */
    async insert(storeName, data) {
        return await this.transaction(storeName, "post", data);
    }

    /**
     * Elimina un singolo messaggio da una chat.
     * @param {string} storeName - Nome dello store (UUID della chat).
     * @param {string} ID - ID del messaggio da eliminare.
     * @returns {Promise<boolean>}
     */
    async delete(storeName, ID) {
        return await this.transaction(storeName, "delete", ID);
    }

    /**
     * Recupera tutti i messaggi di una chat.
     * @param {string} storeName - Nome dello store (UUID della chat).
     * @returns {Promise<Array>}
     */
    async getAll(storeName) {
        return await this.transaction(storeName, "getAll");
    }

    /**
     * Elimina tutti i messaggi di una chat.
     * @param {string} storeName - Nome dello store (UUID della chat).
     * @returns {Promise<boolean>}
     */
    async clearStore(storeName) {
        return await this.transaction(storeName, "clear");
    }
}