import { API } from "../utils/api.js";
import { VaultService } from "./vault.service.js";

export class BackupService {
    /**
     * Crea un nuovo backup
     * @param {Uint8Array}
     * @returns {Promise<boolean>}
     */
    static async create(custom_key = null) {
        // -- ottengo il backup cifrato in byte
        const packed_backup = await VaultService.export_vaults(custom_key);
        // --
        const res = await API.fetch('/backup/', {
            method: 'POST',
            body: packed_backup
        }, {
            content_type: 'bin'
        });
        if (!res) return false;
        return true;
    }
}