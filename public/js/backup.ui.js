import { BackupService } from "../service/backup.service.js";
import { Log } from "../utils/log.js";
import { Form } from "../utils/form.js";

$(document).ready(() => {
    // crea backup su server
    $('#btn-create-backup').on('click', async () => {
        if (!confirm('Are you sure you want to create new backup, you will replace the current one if theres another?')) return;
        // ---
        if (await BackupService.create()) {
            Log.summon(0, "Backup created & saved successfully");
        } else {
            Log.summon(1, "Error creating & saving backup");
        }
    });
    /**
     * RESTORE
     */
    $('#btn-restore-backup-server').on('click', async () => {
        if (!confirm('Are you sure you want to restore from the last backup?')) return;
        // ---
        if (await BackupService.restore_server()) {
            Log.summon(0, "Backup restored successfully");
        } else {
            Log.summon(1, "Error restoring backup");
        }
    });
    /**
     * Genera e scarica un file di backup
     */
    Form.onsubmit('form-create-backup-locally', async (form, elements) => {
        const { key } = elements;
        await BackupService.create_locally(key === '' ? null : key);
        $(form).trigger('reset');
    });
    /**
     * Ripristina un backup da un file locale
     */
    Form.onsubmit('form-restore-backup-from-file', async (form, elements) => {
        const { key, backup_file } = elements;
        // ---
        if (await BackupService.restore_locally(backup_file, key === ''? null : key)) {
            Log.summon(0, "Backup restored successfully");
        } else {
            Log.summon(1, "Error restoring backup");
        }
        $(form).trigger('reset');
    });
});

class BackupUI {
    
}