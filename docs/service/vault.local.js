import { LocalStorage } from "../utils/local.js";

export class VaultLocal {
    // Implement the necessary methods for interacting with the local vault
    /**
     * Salva i vault nel localstorage
     * @param {Array<Object>} vaults 
     * @param {CryptoKey} key 
     */
    static async save(vaults, key = null) {
        await LocalStorage.set('vaults', vaults, key);
    }
    /**
     * Restituisce un vault dal localstorage
     * @param {CryptoKey} key 
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
     * Aggiorna tutti i vaults passati o li aggiunge se non esistono.
     * Rimuove quelli marcati come deleted.
     * @param {Array<Object>} vaults 
     * @param {Uint8Array} key 
     */
    static async sync_update(vaults, key) {
        let local_vaults = await this.get(key);

        // -- costruisce una mappa locale per accesso rapido
        const vaultMap = new Map(local_vaults.map(v => [v.id, v]));

        for (const vault of vaults) {
            if (vault.deleted) {
                vaultMap.delete(vault.id); // rimuove se esiste
            } else {
                vaultMap.set(vault.id, vault); // aggiorna o aggiunge
            }
        }

        // -- ricostruisce l’array finale aggiornato
        const updatedVaults = Array.from(vaultMap.values());

        await this.save(updatedVaults, key);
        // -- debug
        console.log(`[sync_update] Total received: ${vaults.length}, Deleted: ${vaults.filter(v => v.deleted).length}`);
        // ---
        return updatedVaults;
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