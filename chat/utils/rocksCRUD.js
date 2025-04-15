import level from 'level-rocksdb';
import msgpack from '../../public/utils/msgpack.min.js';

/**
 * Classe per interagire con il database RocksDB utilizzando level-rocksdb.
 */
export class RocksCRUD {
    /**
     * Crea una nuova istanza di RocksCRUD.
     * 
     * @param {string} dbPath - Percorso del database RocksDB (ad esempio './data/messages').
     */
    constructor(dbPath) {
        this.db = level(dbPath, { valueEncoding: 'binary' });
    }

    /**
     * Salva un valore nel database RocksDB.
     * 
     * @param {string} key - La chiave con cui salvare il valore.
     * @param {any} value - Il valore da salvare, che verrà serializzato.
     * @returns {Promise<boolean>} - Una promessa che si risolve quando il valore è salvato.
     */
    async put(key, value) {
        try {
            await this.db.put(key, msgpack.encode(value));
            return true;
        } catch (err) {
            console.error(`Errore salvataggio nel database: ${err}`);
            return false;
        }
    }

    /**
     * Recupera un valore dal database RocksDB.
     * 
     * @param {string} key - La chiave del valore da recuperare.
     * @returns {Promise<any>} - Una promessa che restituisce il valore trovato, o null se non trovato.
     */
    async get(key) {
        try {
            const value = await this.db.get(key);
            return msgpack.decode(value);
        } catch (err) {
            if (err.notFound) {
                return null;
            } else {
                console.error(`Errore durante il recupero dal database: ${err}`);
                return null;
            }
        }
    }

    /**
     * Elimina un valore dal database RocksDB.
     * 
     * @param {string} key - La chiave del valore da eliminare.
     * @returns {Promise<boolean>} - Una promessa che si risolve quando il valore è eliminato.
     */
    async del(key) {
        try {
            await this.db.del(key);
            return true;
        } catch (err) {
            console.error(`Errore eliminazione valore: ${err}`);
            return false;
        }
    }
}