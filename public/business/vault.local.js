import { LocalStorage } from "../utils/local.js";

export class VaultLocal {
    // Implement the necessary methods for interacting with the local vault
    static async save(vaults, key = null) {
        await LocalStorage.set('vaults', vaults, key);
    }
    /**
     * Restituisce un vault dal localstorage
     * @param {Uint8Array} key 
     * @returns {Array<Object>}
     */
    static async get(key = null) {
        return await LocalStorage.get('vaults', key) ?? [];
    }
    /**
     * Elimina un vault sul localstorage
     * @param {string} vault_id 
     */
    static delete(vault_id, key = null) {
        const vaults = this.get(key);
        const index = this.get_index(vaults, vault_id);
        vaults.splice(index, 1);
        this.save(vaults);
    }
    /**
     * Restituisce l'index di un vault
     * @param {Array<Object>} vaults 
     * @param {string} vault_id 
     * @returns {string}
     */
    static get_index(vaults, vault_id) {
        return vaults.findIndex(vault => vault.id === vault_id);
    }
    /**
     * Aggiorna tutti i vaults passati o li aggiunge se non esistono
     * @param {Array<Object>} vaults 
     * @param {Uint8Array} key 
     */
    static async sync_update(vaults, key) {
        const local_vaults = await this.get(key);
        for (const vault of vaults) {
            const index = this.get_index(local_vaults, vault.id);
            index !== -1 ? local_vaults[index] = vault : local_vaults.push(vault);
        }
        // ---
        await this.save(local_vaults, key);
        // ---
        return local_vaults;
    }
    /**
     * Aggiorna il singolo vault
     * @param {Object} vault 
     * @param {Uint8Array} key 
     */
    static update(vault, key) {
        const vault_id = vault.id;
        const local_vaults = this.get(key);
        // ---
        const index = this.get_index(local_vaults, vault_id);
        index !== -1 ? local_vaults.push(vault) : local_vaults[index] = vault;
        // ---
        this.save(local_vaults);
        // ---
        return true;
    }
}