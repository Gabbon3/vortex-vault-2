import { Bytes } from "../utils/bytes.js";
import { Cripto } from "../secure/cripto.js";
import { AES256GCM } from "../secure/aesgcm.js";
import { SessionStorage } from "../utils/session.js";
import { Log } from "../utils/log.js";
import msgpack from "../utils/msgpack.min.js";
import { API } from "../utils/api.js";
import { LocalStorage } from "../utils/local.js";
import { VaultLocal } from "./vault.local.js";
import { UUID } from "../utils/uuid.js";

export class VaultService {
    static master_key = null;
    static salt = null;
    static vaults = [];
    static used_usernames = new Set();
    // Tempo da rimuovere da Date.now() per ottenere i vault piu recenti
    static getDateDiff = 30 * 60 * 1000;
    /**
     * Configura i segreti necessari ad utilizzare il vault
     * @returns {boolean} - true se entrambi sono presenti
     */
    static async config_secrets() {
        // -- ottengo la scadenza dell'access token
        const ckeKeyAdvanced = SessionStorage.get('cke-key-advanced');
        // - se scaduto restituisco false cosi verrà rigenerata la sessione
        if (ckeKeyAdvanced === null) return false;
        this.master_key = await LocalStorage.get('master-key', ckeKeyAdvanced);
        this.salt = await LocalStorage.get('salt', ckeKeyAdvanced);
        return this.master_key && this.salt ? true : false;
    }
    /**
     * Sincronizza e inizializza il Vault con il db
     * @param {boolean} full - sincronizzazione completa true, false sincronizza solo il necessario
     * @returns {boolean} true per processo completato con successo
     */
    static async syncronize(full = false) {
        const configured = await this.config_secrets();
        if (!configured || !this.master_key) return Log.summon(2, 'Any Crypto Key founded');
        const vault_update = await LocalStorage.get('vault-update') ?? null;
        let selectFrom = null;
        /**
         * non mi allineo esattamente alla data di ultima sincronizzazione dal db
         * in questo modo evito di farmi restituire dati incompleti per
         * disincronizzazione tra client e server
         */
        if (vault_update) selectFrom = new Date(Date.now() - (this.getDateDiff));
        /**
         * Provo ad ottenere i vault dal localstorage
         */
        this.vaults = await VaultLocal.get(this.master_key);
        if (this.vaults.length === 0) {
            console.log('[i] Sincronizzo completamente con il vault');
            full = true;
        }
        /**
         * VaultLocal.get restituisce [] anche nel caso in cui ce stato un errore crittografico
         * in ogni caso se è vuoto effettuo una sincronizzazione completa con il server
         */
        try {
            const vaults_from_db = await this.get(full ? null : selectFrom);
            if (vaults_from_db.length > 0) {
                if (full) {
                    await VaultLocal.save(
                        vaults_from_db.filter((vault) => { return vault.deleted == false }), 
                        this.master_key
                    );
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
        return true;
    }
    /**
     * Crea un nuovo vault
     * @param {Object} data - I dati da cifrare, entrate vietate ST (SECRET TYPE), T (TITLE) 
     */
    static async create(data) {
        // -- cifro il vault
        const encrypted_bytes = await this.encrypt(data);
        // ---
        const res = await API.fetch("/vaults/create", {
            method: 'POST',
            body: {
                secrets: Bytes.base64.encode(encrypted_bytes)
            }
        });
        // ---
        if (!res) return false;
        return res.id;
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
        // ---
        const res = await API.fetch('/vaults', {
            method: 'GET',
            queryParams: updated_after ? `updated_after=${updated_after.toISOString()}` : null,
        });
        if (!res) return null;
        // ---
        if (res.length > 0) LocalStorage.set('vault-update', new Date());
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
        const encrypted_bytes = await this.encrypt(data);
        // ---
        const res = await API.fetch("/vaults/update", {
            method: 'POST',
            body: {
                vault_id,
                secrets: Bytes.base64.encode(encrypted_bytes)
            }
        });
        // ---
        if (!res) return false;
        return true;
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
            vault.secrets = await this.encrypt(vault.secrets);
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
            if (vault?.secrets?.U && vault.secrets.U.includes('@')) this.used_usernames.add(vault.secrets.U);
        }
    }
    /**
     * Cifra un vault
     * @param {Object} vault 
     * @param {Uint8Array} provided_salt 
     * @returns {Uint8Array}
     */
    static async encrypt(vault, provided_salt = null, master_key = this.master_key) {
        // -- derivo la chiave specifica del vault
        const salt = provided_salt || Cripto.random_bytes(16);
        const key = await Cripto.hmac(salt, master_key);
        // -- cifro il vault
        const vault_bytes = msgpack.encode(vault);
        const encrypted_vault = await AES256GCM.encrypt(vault_bytes, key);
        // -- unisco il salt al vault cifrato
        return Bytes.merge([salt, encrypted_vault], 8);
    }
    /**
     * Decifra un vault
     * @param {Uint8Array} encrypted_bytes 
     * @return {Object} - il vault decifrato
     */
    static async decrypt(encrypted_bytes, master_key = this.master_key) {
        // -- ottengo il salt e i dati cifrati
        const salt = encrypted_bytes.subarray(0, 16);
        const encrypted_vault = encrypted_bytes.subarray(16);
        // -- derivo la chiave specifica del vault
        const key = await Cripto.hmac(salt, master_key);
        // -- decifro i dati
        const decrypted_vault = await AES256GCM.decrypt(encrypted_vault, key);
        // -- decodifico i dati
        return msgpack.decode(decrypted_vault);
    }
    /**
     * Esporta i vaults cifrati
     * @param {Uint8Array} custom_key - Chiave personalizzata da usare al posto della master key
     * @returns {Promise<Uint8Array>} Backup cifrato e compresso
     */
    static async export_vaults(custom_key = null) {
        if (custom_key !== null && custom_key.length !== 32) throw new Error("Custom key must be of 32 bytes length");
        if (!this.vaults || this.vaults.length === 0) {
            console.warn("Any vault to export.");
            return null;
        }
        const export_salt = Cripto.random_bytes(16);
        const export_key = await Cripto.deriveKey(custom_key ?? this.master_key, export_salt);
        // -- preparo il backup con il salt come primo elemento
        const backup = [export_salt];
        const compacted_vaults = this.compact_vaults();
        // -- cifro ogni vault e lo aggiungo al backup
        for (const vault of compacted_vaults) {
            const encrypted_vault = await this.encrypt(vault, null, export_key);
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
        if (custom_key !== null && custom_key.length !== 32) throw new Error("Custom key must be of 32 bytes length");
        // ---
        const vaults = [];
        const backup = msgpack.decode(packed_backup);
        // -- ottengo il salt del backup cosi genero la chiave del backup
        const backup_salt = backup.shift();
        const backup_key = await Cripto.deriveKey(custom_key ?? this.master_key, backup_salt);
        // -- decifro ogni vault
        for (let i = 0; i < backup.length; i++) {
            const decoded_vault = await this.decrypt(backup[i], backup_key);
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
            // non tengo conto dell'uuid, poiche posso tranquillamente ricrearlo
            // const { id: I, secrets: S, createdAt: C, updatedAt: U } = vault;
            const { secrets: S, createdAt: C, updatedAt: U } = vault;
            return { S, C, U };
        });
    }
    /**
     * Decompatta i vaults per renderli nuovamente utilizzabili
     * @param {Array<Object>} compacted_vaults 
     */
    static decompact_vaults(compacted_vaults) {
        return compacted_vaults.map(vault => {
            // non tengo conto dell'uuid, poiche posso tranquillamente ricrearlo
            // const { I: id, S: secrets, C: createdAt, U: updatedAt } = vault;
            const { S: secrets, C: createdAt, U: updatedAt } = vault;
            return { secrets, createdAt, updatedAt };
        });
    }
    /**
     * Importa le password da gsecurity
     * @param {object} json 
     * @returns {Array}
     */
    static import_from_gsecurity(json) {
        let result = [];
        for (const id in json) {
            const j = json[id];
            result.push({
                id: UUID.v7(),
                secrets: {
                    'T': j.sito_web,
                    'U': j.utente,
                    'P': j.password,
                    'O': '',
                    'N': j.note,
                },
                'createdAt': new Date(j.data).toISOString(),
                'updatedAt': new Date(j.data).toISOString(),
            });
        }
        return result;
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
                const encrypted_bytes = await this.encrypt(vaults[i]);
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
        if (vaults instanceof Array === false || vaults.length === 0) return true;
        let i = 0;
        try {
            for (i = 0; i < vaults.length; i++) {
                // -- decripto i secrets
                const encrypted_bytes = new Uint8Array(vaults[i].secrets.data);
                const data = await this.decrypt(encrypted_bytes);
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

window.VaultService = VaultService;