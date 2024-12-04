import { Bytes } from "../utils/bytes.js";
import { Cripto } from "../secure/cripto.js";
import { AES256GCM } from "../secure/aesgcm.js";
import { SessionStorage } from "../utils/session.js";
import { Log } from "../utils/log.js";
import msgpack from "../utils/msgpack.min.js";
import { API } from "../utils/api.js";
import { LocalStorage } from "../utils/local.js";
import { VaultLocal } from "./vault.local.js";

window.VaultLocal = VaultLocal;

export class VaultService {
    static master_key = null;
    static vaults = [];
    static used_usernames = new Set();
    /**
     * Sincronizza e inizializza il Vault con il db
     * @param {boolean} full - sincronizzazione completa true, false sincronizza solo il necessario
     * @returns {boolean} true per processo completato con successo
     */
    static async syncronize(full = false) {
        this.master_key = SessionStorage.get('master-key');
        const vault_update = await LocalStorage.get('vault-update') ?? null;
        if (!this.master_key) return Log.summon(2, 'Any Crypto Key founded');
        // ---
        try {
            this.vaults = await VaultLocal.get(this.master_key);
            const n_local_vaults = this.vaults.length;
            const n_db_vaults = await this.count();
            // recupero tutti i vault se per esempio un vault è stato eliminato sul db
            if (n_local_vaults > n_db_vaults) full = true;
            // se ci sono dei vault nel localstorage recupero solo quelli nuovi
            // recupero tutti i vault se full è true
            const vaults_from_db = await this.get(full ? null : vault_update);
            if (vaults_from_db.length > 0) {
                if (full) {
                    await VaultLocal.save(vaults_from_db, this.master_key);
                    this.vaults = vaults_from_db;
                } else {
                    this.vaults = await VaultLocal.sync_update(vaults_from_db, this.master_key)
                }
            } else {
                // -- se eseguendo il sync totale non ci sono vault nel db allora azzero per sicurezza anche in locale
                if (full) await VaultLocal.save([], this.master_key);
            }
        } catch (error) {
            console.warn('Sync Error - Vault => ', error);
            LocalStorage.remove('vault-update');
            LocalStorage.remove('vaults');
            return false;
        }
        this.load_used_usernames();
        // -- ordino l'array
        this.vaults.sort((a, b) => a.secrets.T.localeCompare(b.secrets.T));
        return true;
    }
    /**
     * Crea un nuovo vault
     * @param {Object} data - I dati da cifrare
     */
    static async create(data) {
        // -- cifro il vault
        const bytes = msgpack.encode(data);
        const encrypted_bytes = await AES256GCM.encrypt(bytes, this.master_key);
        // ---
        const res = await API.fetch("/vaults/create", {
            method: 'POST',
            body: {
                secrets: Bytes.base64.to(encrypted_bytes)
            }
        });
        // ---
        if (!res) return false;
        return res;
    }
    /**
     * Cerca un vault tramite id
     * @param {string} vault_id 
     * @returns {Object} l'oggetto di un vault
     */
    static async get_id(vault_id) {
        const res = await API.fetch(`/vaults/${vault_id}`, {
            method: 'GET'
        });
        if (!res) return null;
        return res;
    }
    /**
     * Restituisce tutti i vault che sono stati aggiorati dopo una certa data
     * @param {Date} updated_after - opzionale, se nullo restituirà tutti i vault
     * @returns {Array<Object>} un array di oggetti vault
     */
    static async get(updated_after = null) {
        let url = '/vaults';
        if (updated_after) url += `?updated_after=${updated_after.toISOString()}`;
        // ---
        const res = await API.fetch(url, {
            method: 'GET',
        });
        if (!res) return null;
        // ---
        if (res.length > 0) LocalStorage.set('vault-update', new Date());
        // ---
        return await this.decrypt_vaults(res) ? res : null;
    }
    /**
     * Restituisce il numero totale di vault del db
     * @returns {number}
     */
    static async count() {
        const res = await API.fetch('/vaults/count', {
            method: 'GET',
        });
        if (!res) return 0;
        return res.count;
    }
    /**
     * Modifica un vault
     * @param {string} vault_id 
     * @param {Object} data - I dati da cifrare
     */
    static async update(vault_id, data) {
        // -- cifro il vault
        const bytes = msgpack.encode(data);
        const encrypted_bytes = await AES256GCM.encrypt(bytes, this.master_key);
        // ---
        const res = await API.fetch("/vaults/update", {
            method: 'POST',
            body: {
                vault_id,
                secrets: Bytes.base64.to(encrypted_bytes)
            }
        });
        // ---
        if (!res) return false;
        return res;
    }
    /**
     * Reimposta tutti i vault sul db
     * @param {string} mfa_code codice multifattore perchè un operazione sensibile
     * @returns {boolean}
     */
    static async restore(vaults) {
        await VaultLocal.save(vaults, this.master_key);
        // -- cifro i vault
        for (const vault of vaults) {
            const bytes = msgpack.encode(vault.secrets);
            const encrypted_bytes = await AES256GCM.encrypt(bytes, this.master_key);
            vault.secrets = encrypted_bytes;
        }
        // ---
        const packed_vaults = msgpack.encode(vaults);
        // ---
        const res = await API.fetch('/vaults/restore', {
            method: 'POST',
            body: packed_vaults
        }, {
            content_type: 'bin'
        });
        if (!res) return false;
        return true;
    }
    /**
     * Elimina un vault tramite id
     * @param {string} vault_id 
     * @returns {boolean}
     */
    static async delete(vault_id) {
        const res = await API.fetch(`/vaults/${vault_id}`, {
            method: 'DELETE'
        }, {
            return_type: 'text'
        });
        if (!res) return false;
        return true;
    }
    /**
     * Restituisce un vault tramite id
     * @param {string} vault_id 
     * @returns {Object}
     */
    static get_vault(vault_id) {
        return this.vaults[this.get_index(vault_id)];
    }
    /**
     * Restituisce l'index di un vault
     * @param {Array<Object>} vaults 
     * @param {string} vault_id 
     * @returns {string}
     */
    static get_index(vault_id, vaults = this.vaults) {
        return vaults.findIndex(vault => vault.id === vault_id);
    }
    /**
     * Carica gli username utilizzati
     * @param {Array<Object>} [vaults=this.vaults]
     */
    static load_used_usernames(vaults = this.vaults) {
        for (const vault of vaults) {
            if (vault.secrets.U.includes('@')) this.used_usernames.add(vault.secrets.U);
        }
    }
    /**
     * Esporta i vaults cifrati
     * @param {Uint8Array} custom_key - Chiave personalizzata da usare al posto della master key
     * @returns {Promise<Uint8Array>} Backup cifrato e compresso
     */
    static async export_vaults(custom_key = null) {
        if (!this.vaults || this.vaults.length === 0) {
            console.warn("Any vault to export.");
            return null;
        }
        const backup_salt = Cripto.random_bytes(16);
        const backup_key = await Cripto.derive_key(custom_key ?? this.master_key, backup_salt);
        // -- preparo il backup con il salt come primo elemento
        const backup = [backup_salt];
        const compacted_vaults = this.compact_vaults();
        // -- cifro ogni vault e lo aggiungo al backup
        for (const vault of compacted_vaults) {
            const encoded_vault = msgpack.encode(vault);
            const encrypted_vault = await AES256GCM.encrypt(encoded_vault, backup_key);
            backup.push(encrypted_vault);
        }
        // -- converto il backup completo in formato MessagePack
        return msgpack.encode(backup);
    }
    /**
     * Operazione inversa di esporta vaults
     * @param {Uint8Array} packed_backup 
     * @param {Uint8Array} custom_key 
     * @returns {Promise<Array<Object>>} i vaults
     */
    static async import_vaults(packed_backup, custom_key = null) {
        const vaults = [];
        const backup = msgpack.decode(packed_backup);
        // -- ottengo il salt del backup cosi genero la chiave del backup
        const backup_salt = backup.shift();
        const backup_key = await Cripto.derive_key(custom_key ?? this.master_key, backup_salt);
        // -- decifro ogni vault
        for (const vault of backup) {
            const decrypted_vault = await AES256GCM.decrypt(vault, backup_key);
            const decoded_vault = msgpack.decode(decrypted_vault);
            vaults.push(decoded_vault);
        }
        // -- decompatto i vaults
        return this.decompact_vaults(vaults);
    }
    /**
     * Compatta i vaults per renderli pronti all esportazione
     * @returns {Array<Object>} l'array dei vault compattati
     */
    static compact_vaults(vaults = this.vaults) {
        return vaults.map(vault => {
            const { id: I, secrets: S, createdAt: C, updatedAt: U } = vault;
            return { I, S, C, U };
        });
    }
    /**
     * Decompatta i vaults per renderli nuovamente utilizzabili
     * @param {Array<Object>} compacted_vaults 
     */
    static decompact_vaults(compacted_vaults) {
        return compacted_vaults.map(vault => {
            const { I: id, S: secrets, C: createdAt, U: updatedAt } = vault;
            return { id, secrets, createdAt, updatedAt };
        });
    }
    /**
     * Cifra tutti i vault 
     * @param {Array<Object>} vaults - array dei vari vault
     */
    static async encrypt_vaults(vaults) {
        let i = 0;
        try {
            for (i = 0; i < vaults.length; i++) {
                // -- decripto i secrets
                const bytes = msgpack.encode(vaults[i]);
                const encrypted_bytes = await AES256GCM.encrypt(bytes, this.master_key);
                // ---
                vaults[i].secrets = encrypted_bytes;
            }
        } catch (error) {
            console.warn(`Decrypt Vault error at i = ${i}:`, error);
            return false;
        }
        return true;
    }
    /**
     * Decifra tutti i vault 
     * @param {Array<Object>} vaults - array dei vari vault
     */
    static async decrypt_vaults(vaults) {
        let i = 0;
        try {
            for (i = 0; i < vaults.length; i++) {
                // -- decripto i secrets
                const encrypted_bytes = new Uint8Array(vaults[i].secrets.data);
                const bytes = await AES256GCM.decrypt(encrypted_bytes, this.master_key);
                const data = msgpack.decode(bytes);
                // --
                vaults[i].secrets = data;
            }
        } catch (error) {
            console.warn(`Decrypt Vault error at i = ${i}:`, error);
            return false;
        }
        return true;
    }
}

window.Vault = VaultService;