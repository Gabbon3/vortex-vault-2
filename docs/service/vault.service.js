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
import { KeyStore } from "../secure/keystore.js";

export class VaultService {
    static keyStore = new KeyStore('VaultKeys');
    static KEK = null;
    static DEK = null;
    static salt = null;
    static vaults = [];
    static used_usernames = new Set();
    // Tempo da rimuovere dall'ultima-sincronizzazione per ottenere i vault piu recenti
    // Questo per evitare possibili ritardi che potrebbero non far restituire correttamente tutti i dati
    static getDateDiff = 2 * 60 * 1000;
    /**
     * Configura i segreti necessari ad utilizzare il vault
     * @returns {boolean} - true se entrambi sono presenti
     */
    static async configSecrets() {
        // -- verifico se la sessione è attiva
        const accessTokenExpiry = SessionStorage.get("access-token-expiry");
        // - se scaduto restituisco false cosi verrà rigenerata la sessione
        if (accessTokenExpiry === null) return false;
        this.KEK = await this.keyStore.loadKey("KEK");
        this.DEK = await this.keyStore.loadKey("DEK");
        this.salt = await LocalStorage.get("salt");
        return this.KEK && this.DEK && this.salt ? true : false;
    }
    /**
     * Sincronizza e inizializza il Vault con il db
     * @param {boolean} full - sincronizzazione completa true, false sincronizza solo il necessario
     * @returns {boolean} true per processo completato con successo
     */
    static async syncronize(full = false) {
        const configured = await this.configSecrets();
        if (!configured)
            return Log.summon(2, "Any Crypto Key founded");
        const vault_update = (await LocalStorage.get("vault-update")) ?? null;
        let selectFrom = null;
        /**
         * non mi allineo esattamente alla data di ultima sincronizzazione dal db
         * in questo modo evito di farmi restituire dati incompleti per
         * disincronizzazione tra client e server
         */
        if (vault_update) selectFrom = new Date(vault_update - this.getDateDiff);
        /**
         * Provo ad ottenere i vault dal localstorage
         */
        this.vaults = await VaultLocal.get(this.DEK);
        if (this.vaults.length === 0) {
            console.log("[i] Sincronizzo completamente con il vault");
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
                    VaultLocal.save(
                        vaults_from_db.filter((vault) => {
                            return vault.deleted == false;
                        }),
                        this.DEK
                    );
                    this.vaults = vaults_from_db;
                } else {
                    this.vaults = await VaultLocal.sync_update(
                        vaults_from_db,
                        this.DEK
                    );
                }
                // -- aggiorno la data di ultima sincronizzazione con il db
                LocalStorage.set("vault-update", new Date());
            } else {
                // -- se eseguendo il sync totale non ci sono vault nel db allora azzero per sicurezza anche in locale
                if (full) await VaultLocal.save([], this.DEK);
            }
        } catch (error) {
            console.warn("Sync Error - Vault => ", error);
            LocalStorage.remove("vault-update");
            LocalStorage.remove("vaults");
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
        const encryptedVault = await this.encrypt(data);
        // ---
        const res = await API.fetch("/vaults/create", {
            method: "POST",
            body: {
                secrets: Bytes.base64.encode(encryptedVault),
            },
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
            method: "GET",
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
        const res = await API.fetch("/vaults", {
            method: "GET",
            queryParams: updated_after
                ? `updated_after=${updated_after.toISOString()}`
                : null,
        });
        if (!res) return null;
        // ---
        return (await this.decryptAllVaults(res)) ? res : null;
    }
    /**
     * Modifica un vault
     * @param {string} vaultId
     * @param {Object} data - I dati da cifrare
     */
    static async update(vaultId, data) {
        // -- cifro il vault
        const encryptedVault = await this.encrypt(data);
        // ---
        const res = await API.fetch("/vaults/update", {
            method: "POST",
            body: {
                vault_id: vaultId,
                secrets: Bytes.base64.encode(encryptedVault),
            },
        });
        // ---
        if (!res) return false;
        return true;
    }
    /**
     * Reimposta tutti i vault sul db
     * @returns {boolean}
     */
    static async restore(vaults, saveLocally = true) {
        // -- cifro i vault
        for (const vault of vaults) {
            const secrets = await this.encrypt(vault.secrets);
            vault.secrets = secrets;
        }
        // ---
        const packed_vaults = msgpack.encode(vaults);
        // ---
        const res = await API.fetch(
            "/vaults/restore",
            {
                method: "POST",
                body: packed_vaults,
            },
            {
                content_type: "bin",
            }
        );
        if (!res) return false;
        // ---
        if (saveLocally) await VaultLocal.save(vaults, this.DEK);
        // ---
        return true;
    }
    /**
     * Elimina un vault tramite id
     * @param {string} vault_id
     * @returns {boolean}
     */
    static async delete(vault_id) {
        const res = await API.fetch(
            `/vaults/${vault_id}`,
            {
                method: "DELETE",
            },
            {
                return_type: "text",
            }
        );
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
        return vaults.findIndex((vault) => vault.id === vault_id);
    }
    /**
     * Carica gli username utilizzati
     * @param {Array<Object>} [vaults=this.vaults]
     */
    static load_used_usernames(vaults = this.vaults) {
        for (const vault of vaults) {
            if (vault?.secrets?.U && vault.secrets.U.includes("@"))
                this.used_usernames.add(vault.secrets.U);
        }
    }
    /**
     * Cifra un vault
     * @param {Object} vault
     * @param {Uint8Array} [DEK=this.DEK] 
     * @returns {Uint8Array}
     */
    static async encrypt(vault, DEK = this.DEK) {
        // -- cifro il vault
        const encodedVault = msgpack.encode(vault);
        const encryptedVault = await AES256GCM.encrypt(encodedVault, DEK);
        // -- unisco il salt al vault cifrato
        return encryptedVault;
    }
    /**
     * Decifra un vault
     * @param {Uint8Array} encrypted
     * @param {Uint8Array} DEK
     * @return {Object} - il vault decifrato insieme alla DEK cifrata
     */
    static async decrypt(encryptedVault, DEK = this.DEK) {
        // -- decifro i dati
        const decryptedVault = await AES256GCM.decrypt(encryptedVault, DEK);
        // ---
        return msgpack.decode(decryptedVault);
    }
    /**
     * Esporta i vaults cifrati
     * @param {Uint8Array} customKey - Chiave personalizzata da usare al posto della master key
     * @returns {Promise<Uint8Array>} Backup cifrato e compresso
     */
    static async exportVaults(customKey = null) {
        if (customKey !== null && customKey.length !== 32)
            throw new Error("Custom key must be of 32 bytes length");
        if (!this.vaults || this.vaults.length === 0) {
            console.warn("Any vault to export.");
            return null;
        }
        const exportSalt = Cripto.randomBytes(16);
        const exportKey = await Cripto.deriveKey(
            customKey ?? this.KEK,
            exportSalt
        );
        // -- preparo il backup con il salt come primo elemento
        const backup = [exportSalt];
        const compactedVaults = this.compactVaults();
        // -- cifro ogni vault e lo aggiungo al backup
        for (const vault of compactedVaults) {
            const encryptedVault = await this.encrypt(vault, exportKey);
            backup.push(encryptedVault);
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
    static async importVaults(packed_backup, custom_key = null) {
        if (custom_key !== null && custom_key.length !== 32)
            throw new Error("Custom key must be of 32 bytes length");
        // ---
        const vaults = [];
        const backup = msgpack.decode(packed_backup);
        // -- ottengo il salt del backup cosi genero la chiave del backup
        const backup_salt = backup.shift();
        const backup_key = await Cripto.deriveKey(
            custom_key ?? this.KEK,
            backup_salt
        );
        // -- decifro ogni vault
        for (let i = 0; i < backup.length; i++) {
            const vault = await this.decrypt(
                backup[i],
                backup_key
            );
            vaults.push(vault);
        }
        // -- decompatto i vaults
        return this.decompactVaults(vaults);
    }
    /**
     * Ricifra la DEK con la nuova KEK
     * @param {string} email 
     * @param {string} newPassword 
     * @param {Uint8Array} salt
     * @returns {Uint8Array} la nuova KEK
     */
    static async rotateKEK(email, newPassword, salt) {
        try {
            const ckeKey = SessionStorage.get("cke-key-advanced");
            if (!ckeKey) throw new Error('CKE non presente');
            // ---
            const DEK = VaultService.DEK;
            const newKEK = await Cripto.deriveKey(newPassword, salt);
            /**
             * Cifro la DEK con la nuova KEK
             */
            const encryptedDEK = await AES256GCM.encrypt(DEK, newKEK);
            // ---
            const res = await API.fetch(
                "/auth/password",
                {
                    method: "POST",
                    body: {
                        email,
                        newPassword: await Cripto.obfuscatePassword(newPassword),
                        dek: Bytes.base64.encode(encryptedDEK)
                    }
                }
            );
            if (!res) throw new Error('Rotazione fallita');
            // --
            VaultService.KEK = newKEK;
            // -- salvo la master key
            await SessionStorage.set('master-key', newKEK);
            await LocalStorage.set('master-key', newKEK, ckeKey);
            // ---
            return newKEK;
        } catch (error) {
            console.warn("rotateKEK - ERROR : ", error);
            return false;
        }
    }
    /**
     * Compatta i vaults per renderli pronti all esportazione
     * @returns {Array<Object>} l'array dei vault compattati
     */
    static compactVaults(vaults = this.vaults) {
        return vaults.map((vault) => {
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
    static decompactVaults(compacted_vaults) {
        return compacted_vaults.map((vault) => {
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
                    T: j.sito_web,
                    U: j.utente,
                    P: j.password,
                    O: "",
                    N: j.note,
                },
                createdAt: new Date(j.data).toISOString(),
                updatedAt: new Date(j.data).toISOString(),
            });
        }
        return result;
    }
    /**
     * Decifra tutti i vault
     * @param {Array<Object>} vaults - array dei vari vault
     */
    static async decryptAllVaults(vaults) {
        if (vaults instanceof Array === false || vaults.length === 0)
            return true;
        let i = 0;
        try {
            for (i = 0; i < vaults.length; i++) {
                // -- decripto i secrets
                const encryptedSecrets = new Uint8Array(vaults[i].secrets.data);
                const secrets = await this.decrypt(encryptedSecrets);
                // --
                vaults[i].secrets = secrets;
            }
        } catch (error) {
            console.warn(`Decrypt Vault error at i = ${i}:`, error);
            return false;
        }
        return true;
    }
}

window.VaultService = VaultService;
