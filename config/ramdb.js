import msgpack from "msgpack-lite";

export class RamDB {
    static db = {};
    static max_ttl = 60 * 60; // 1 ora
    static cleanup_interval = 60 * 10 * 1000; // 10 minuti
    static cleanup = false;
    /**
     * Imposta un valore nel ramdb, serializzato con msgpack
     * ha una scadenza di default di 1 ora che non puo essere superata
     * @param {string} key
     * @param {*} value
     * @param {number} ttl - seconds - 0 > ttl => 3600
     * @returns {boolean}
     */
    static set(key, value, ttl = this.max_ttl) {
        // -- verifico se il ttl è stato disposto correttamente
        if (ttl < 0 || ttl >= this.max_ttl) return false;
        let encoded_value = null;
        // -- prima provo a convertire
        try {
            encoded_value = msgpack.encode(value);
        } catch (error) {
            console.warn("RAMDB: Error while encoding " + key + error);
            return false;
        }
        // -- poi elimino il vecchio dato se si sta rimpiazzando
        if (this.has(key)) this.delete(key);
        // ---
        const expire = Date.now() + ttl * 1000;
        // -- memorizzo il dato
        this.db[key] = [encoded_value, expire];
        // ---
        return true;
    }
    /**
     * Verifica se un dato esiste nel db (verificando anche se non è scaduto)
     * @param {string} key
     * @returns {boolean}
     */
    static has(key) {
        const exist = this.db.hasOwnProperty(key);
        if (!exist) return false;
        // -- se esiste verifico che non sia scaduta
        // -- se scaduta elimino e restituisco false
        const record = this.db[key];
        const expire = record[1];
        if (Date.now() > expire) {
            this.delete(key);
            return false;
        }
        return true;
    }
    /**
     * Restituisce un valore dal ramdb
     * @param {string} key
     * @param {boolean} [ttl=false] - true per restituire anche il ttl
     * @returns {*}
     */
    static get(key, ttl = false) {
        const exist = this.has(key);
        if (!exist) return null;
        // ---
        const record = this.db[key];
        // ---
        try {
            const decoded_value = msgpack.decode(record[0]);
            return ttl ? [decoded_value, record[1]] : decoded_value;
        } catch (error) {
            console.warn("RAMDB: Error while decoding " + key + error);
            return false;
        }
    }
    /**
     * Aggiorna un elemento sul db
     * @param {string} key 
     * @param {object} updated_value 
     * @returns 
     */
    static update(key, updated_values) {
        const record = this.get(key, true);
        if (!record) return false;
        // ---
        const expire = record[1];
        // -- prima provo a serializzare
        let encoded_value = null;
        try {
            encoded_value = msgpack.encode(updated_values);
        } catch (error) {
            console.warn("RAMDB update: Error while encoding " + key + error);
            return false;
        }
        // -- memorizzo il dato
        this.db[key] = [encoded_value, expire];
        // ---
        return true;
    }
    /**
     * Elimina un record dal db
     * @param {string} key
     * @returns {boolean}
     */
    static delete(key) {
        delete this.db[key];
        return true;
    }
    /**
     * Pulisce l'intero db
     */
    static clear() {
        this.db = {};
    }
    /**
     * Periodicamente vengono controllati i record scaduti
     * e se lo sono vengono eliminati
     */
    static start_cleanup() {
        if (this.cleanup) return;
        this.cleanup = true;
        // ---
        const cleanupFn = () => {
            const now = Date.now();
            for (const key in this.db) {
                if (this.db[key][1] <= now) {
                    this.delete(key);
                }
            }
            setTimeout(cleanupFn, this.cleanup_interval);
        };
        // ---
        cleanupFn();
    }
}

RamDB.start_cleanup();