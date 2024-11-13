import { Bytes } from "../utils/bytes.js";
import { Cripto } from "../secure/cripto.js";
import { AES256GCM } from "../secure/aesgcm.js";
import { Form } from "../utils/form.js";
import { SessionStorage } from "../utils/session.js";
import { Log } from "../utils/log.js";
import msgpack from "../utils/msgpack.min.js";
import { API } from "../utils/api.js";
import { LocalStorage } from "../utils/local.js";
import { VaultLocal } from "./vault.local.js";

window.VaultLocal = VaultLocal;

export class VaultBusiness {
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
        if (!this.master_key) return Log.summon(2, 'Nessuna chiave crittografica trovata');
        // ---
        try {
            this.vaults = await VaultLocal.get(this.master_key);
            const n_local_vaults = this.vaults.length;
            const n_db_vaults = await this.count();
            // recupero tutti i vault se per esempio un vault è stato eliminato sul db
            if (n_local_vaults > n_db_vaults) full = true;
            // se ci sono dei vault nel localstorage recupero solo quelli nuovi
            // recupero tutti i vault se full è true
            const vaults_from_db = await this.get(this.vaults.length > 0 && !full ? vault_update : null);
            if (vaults_from_db.length > 0) {
                if (!full) {
                    this.vaults = await VaultLocal.sync_update(vaults_from_db, this.master_key)
                } else {
                    await VaultLocal.save(vaults_from_db, this.master_key);
                    this.vaults = vaults_from_db;
                }
            }
        } catch (error) {
            console.warn('Sync Error - Vault => ', error);
            return false;
        }
        this.load_used_usernames();
        // ---
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
     * Elimina un vault tramite id
     * @param {string} vault_id 
     * @returns {boolean}
     */
    static async delete(vault_id) {
        const res = await API.fetch(`/vaults/${vault_id}`, {
            method: 'DELETE'
        }, 'text');
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

window.Vault = VaultBusiness;