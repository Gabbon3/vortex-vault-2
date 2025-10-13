/**
 * Gestore compatto per CryptoKey in IndexedDB
 */
export class KeyStore {
    constructor(dbName = 'KeyStore') {
        this.dbName = dbName;
        this.db = null;
    }

    /**
     * Inizializza il database
     * @returns {Promise<IDBDatabase>}
     */
    async init() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 2); // cambia versione per forzare l'upgrade

            request.onupgradeneeded = (e) => {
                const db = e.target.result;

                // se esiste già uno store "keys", lo eliminiamo e lo ricreiamo pulito
                if (db.objectStoreNames.contains('keys')) {
                    db.deleteObjectStore('keys');
                }

                // creiamo lo store con keyPath = 'name'
                db.createObjectStore('keys', { keyPath: 'name' });
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };

            request.onerror = () => reject(request.error);

            request.onblocked = () => {
                console.warn('Aggiornamento IndexedDB bloccato. Chiudi altre schede che usano lo stesso DB.');
            };
        });
    }


    /**
     * Salva una CryptoKey (sovrascrive se esiste già)
     * @param {CryptoKey} key - Chiave da salvare
     * @param {string} name - Nome identificativo (usato come chiave primaria)
     * @returns {Promise<string>} Nome della chiave salvata
     */
    async saveKey(key, name) {
        if (!(key instanceof CryptoKey)) {
            throw new Error('Il parametro "key" deve essere una CryptoKey');
        }

        await this.init();

        return new Promise((resolve, reject) => {
            const store = this.db.transaction(['keys'], 'readwrite').objectStore('keys');
            const keyData = {
                name, // Usato come chiave primaria
                key,
                timestamp: new Date()
            };

            // put() sovrascrive se esiste già un record con lo stesso name
            const request = store.put(keyData);

            request.onsuccess = () => resolve(name);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Carica una CryptoKey per nome
     * @param {string} name - Nome della chiave
     * @returns {Promise<CryptoKey|null>}
     */
    async loadKey(name) {
        await this.init();

        return new Promise((resolve, reject) => {
            const store = this.db.transaction(['keys'], 'readonly').objectStore('keys');
            const request = store.get(name);

            request.onsuccess = () => resolve(request.result?.key || null);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Elimina una chiave specifica per nome
     * @param {string} name - Nome della chiave da eliminare
     * @returns {Promise<boolean>} True se eliminata, false se non esisteva
     */
    async deleteKey(name) {
        await this.init();

        return new Promise((resolve, reject) => {
            const store = this.db.transaction(['keys'], 'readwrite').objectStore('keys');
            const request = store.delete(name);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Ottieni tutti i nomi delle chiavi salvate
     * @returns {Promise<string[]>}
     */
    async listKeys() {
        await this.init();

        return new Promise((resolve, reject) => {
            const store = this.db.transaction(['keys'], 'readonly').objectStore('keys');
            const request = store.getAllKeys();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Verifica se una chiave esiste
     * @param {string} name - Nome della chiave
     * @returns {Promise<boolean>}
     */
    async hasKey(name) {
        await this.init();

        return new Promise((resolve, reject) => {
            const store = this.db.transaction(['keys'], 'readonly').objectStore('keys');
            const request = store.getKey(name);

            request.onsuccess = () => resolve(request.result !== undefined);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Pulisce tutte le chiavi (come localStorage.clear())
     * @returns {Promise<void>}
     */
    async clear() {
        await this.init();

        return new Promise((resolve, reject) => {
            const store = this.db.transaction(['keys'], 'readwrite').objectStore('keys');
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}