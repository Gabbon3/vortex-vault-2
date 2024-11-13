import { Bytes } from "../utils/bytes.js";
import { Cripto } from "../secure/cripto.js";
import { AES256GCM } from "../secure/aesgcm.js";
import { Form } from "../utils/form.js";
import { SessionStorage } from "../utils/session.js";
import { Log } from "../utils/log.js";
import msgpack from "../utils/msgpack.min.js";
import { API } from "../utils/api.js";

export class VaultBusiness {
    static master_key = null;
    static vaults = [];
    static used_usernames = new Set();
    static indexs = {};
    /**
     * Inizializza il vault
     * @returns 
     */
    static async init() {
        this.master_key = SessionStorage.get('master-key');
        if (!this.master_key) return Log.summon(2, 'Nessuna chiave crittografica trovata');
        // ---
        this.vaults = await this.get();
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
        return await this.decrypt_vaults(res) ? res : null;
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
     * Restituisce un vault
     * @param {string} vault_id 
     * @returns {Object}
     */
    static get_vault(vault_id) {
        return this.vaults[this.indexs[vault_id]];
    }
    /**
     * Carica gli username utilizzati
     * @param {Array<Object>} vaults 
     */
    static load_used_usernames(vaults) {
        // ---
        for (const vault of vaults) {
            if (vault.U.includes('@')) this.used_usernames.add(vault.U);
        }
    }
    /**
     * Inizializza tutti gli index dei vault
     * @param {Array<Object>} [vaults=this.vaults] - array dei vari vault
     */
    static init_indexs(vaults = this.vaults) {
        for (let i = 0; i < vaults.length; i++) {
            this.indexs[vaults[i].id] = i;
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
                this.indexs[vaults[i].id] = i;
            }
        } catch (error) {
            console.warn(`Decrypt Vault error at i = ${i}:`, error);
            return false;
        }
        return true;
    }
}

window.Vault = VaultBusiness;