export class IndexedDb {
    constructor(dbName = "appDB") {
        this.dbName = dbName;
        this.db = null;
    }

    /**
     * Inizializza il database con uno store specificato.
     * @param {string} storeName - Nome dello store da creare
     * @param {string} keyPath - Chiave primaria per lo store
     * @param {Array} indexes - Array di oggetti { name, keyPath, unique }
     * @returns {Promise<boolean>}
     */
    async init(storeName, keyPath = "id", indexes = []) {
        if (this.db) return true;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    const store = db.createObjectStore(storeName, { keyPath });
                    // -- Creazione degli indici dinamici
                    indexes.forEach(({ name, keyPath, unique }) => {
                        store.createIndex(name, keyPath, { unique });
                    });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(true);
            };

            request.onerror = (event) => {
                console.warn(`❌ Errore nell'inizializzazione del database:`, event.target.error);
                resolve(false);
            };
        });
    }

    /**
     * Inserisce un elemento nello store specificato.
     * @param {string} storeName - Nome dello store
     * @param {Object} data - Dati da inserire (deve contenere la chiave primaria)
     * @returns {Promise<boolean>}
     */
    async insert(storeName, data) {
        if (!this.db) throw new Error("DB not initialized");
        // ---
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            // ---
            const request = store.add(data);
            request.onsuccess = () => resolve(true);
            request.onerror = (event) => {
                console.warn(`❌ Errore nell'inserimento:`, event.target.error);
                resolve(false);
            };
        });
    }

    /**
     * Recupera un elemento dallo store tramite chiave primaria.
     * @param {string} storeName - Nome dello store
     * @param {string|number} id - Chiave primaria dell'elemento
     * @returns {Promise<Object|null>}
     */
    async get(storeName, id) {
        if (!this.db) throw new Error("DB not initialized");
        // ---
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            // ---
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = (event) => {
                console.warn(`❌ Errore nel recupero:`, event.target.error);
                resolve(null);
            };
        });
    }

    /**
     * Recupera tutti gli elementi dallo store o quelli filtrati da un indice.
     * @param {string} storeName - Nome dello store
     * @param {string} [indexName] - Nome dell'indice per filtrare i risultati (opzionale)
     * @param {string|number} [queryValue] - Valore da cercare nell'indice (opzionale)
     * @returns {Promise<Array>}
     */
    async getAll(storeName, indexName = null, queryValue = null) {
        if (!this.db) throw new Error("DB not initialized");
        // ---
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            // ---
            let request;
            if (indexName && queryValue !== null) {
                const index = store.index(indexName);
                request = index.getAll(queryValue);
            } else {
                request = store.getAll();
            }
            // ---
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (event) => {
                console.warn(`❌ Errore nel recupero dei dati:`, event.target.error);
                resolve([]);
            };
        });
    }

    /**
     * Elimina un elemento dallo store tramite chiave primaria.
     * @param {string} storeName - Nome dello store
     * @param {string|number} id - Chiave primaria dell'elemento
     * @returns {Promise<boolean>}
     */
    async delete(storeName, id) {
        if (!this.db) throw new Error("DB not initialized");
        // ---
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            // ---
            const request = store.delete(id);
            request.onsuccess = () => resolve(true);
            request.onerror = (event) => {
                console.warn(`❌ Errore nella cancellazione:`, event.target.error);
                resolve(false);
            };
        });
    }

    /**
     * Elimina tutti gli elementi di uno store in base a un valore di un indice.
     * @param {string} storeName - Nome dello store
     * @param {string} indexName - Nome dell'indice
     * @param {string|number} queryValue - Valore da filtrare
     * @returns {Promise<boolean>}
     */
    async deleteByIndex(storeName, indexName, queryValue) {
        if (!this.db) throw new Error("DB not initialized");
        // ---
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            // ---
            const request = index.openCursor(queryValue);
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve(true);
                }
            };
            request.onerror = (event) => {
                console.warn(`❌ Errore nella cancellazione:`, event.target.error);
                resolve(false);
            };
        });
    }

    /**
     * Cancella completamente il database.
     * @returns {Promise<boolean>}
     */
    async deleteDatabase() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close();
            }
            // ---
            const request = indexedDB.deleteDatabase(this.dbName);
            request.onsuccess = () => resolve(true);
            request.onerror = (event) => {
                console.warn(`❌ Errore nell'eliminazione del database:`, event.target.error);
                resolve(false);
            };
        });
    }
}