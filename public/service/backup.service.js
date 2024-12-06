import { VaultUI } from "../js/vault.ui.js";
import { API } from "../utils/api.js";
import { date } from "../utils/dateUtils.js";
import { FileUtils } from "../utils/file.utils.js";
import { VaultService } from "./vault.service.js";

export class BackupService {
    /**
     * Crea un nuovo backup
     * @param {Uint8Array}
     * @returns {Promise<boolean>}
     */
    static async create() {
        // -- ottengo il backup cifrato in byte
        const packed_backup = await VaultService.export_vaults();
        if (!packed_backup) return false;
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
    /**
     * Crea e scarica un file di backup
     * @param {string} custom_key 
     * @returns 
     */
    static async create_locally(custom_key = null) {
        const packed_backup = await VaultService.export_vaults(custom_key);
        if (!packed_backup) return false;
        // ---
        FileUtils.download(`Passwords Backup - ${date.format('%d %M %Y')}`, 'bin', packed_backup, 'application/octet-stream');
        return true;
    }
    /**
     * Restituisce tutti i backup
     * @returns {Array<Object>}
     */
    static async get() {
        const res = await API.fetch('/backup/', {
            method: 'GET',
        });
        if (!res) return false;
        // -- converto in uint8array l'attributo bin
        for (const backup of res) {
            backup.bin = new Uint8Array(backup.bin.data);
        }
        // ---
        return res;
    }
    /**
     * Reimposta tutti i vault salvati in un backup
     * @returns {boolean}
     */
    static async restore_server() {
        const backups = await this.get();
        if (!backups) return false;
        // ---
        const backup = backups[0].bin;
        const vaults = await VaultService.import_vaults(backup);
        // ---
        const restored = await VaultService.restore(vaults);
        // ---
        if (!restored) return false;
        VaultUI.init_db_dom(true);
        return true;
    }
    /**
     * Reimposta tutti i vault salvati in un file di backup
     * @param {File} file 
     * @returns 
     */
    static async restore_locally(file, custom_key = null) {
        const backup = new Uint8Array(await FileUtils.read(file));
        // ---
        if (!backup) return false;
        custom_key = custom_key ? new TextEncoder().encode(custom_key) : null;
        let vaults = null;
        try {
            vaults = await VaultService.import_vaults(backup, custom_key);
        } catch (e) {
            console.warn(e);
            return false;
        }
        // ---
        const restored = await VaultService.restore(vaults);
        // ---
        if (!restored) return false;
        VaultUI.init_db_dom(true);
        return true;
    }
}

window.BackupService = BackupService;