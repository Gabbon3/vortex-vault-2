import { BackupService } from "../service/backup.service.js";
import { Log } from "../utils/log.js";

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
    $('#btn-create-backup-locally').on('click', () => {
        const custom_password = $('#backup-custom-password').val();
        BackupService.create_locally(custom_password === '' ? null : custom_password);
    });
    /**
     * Ripristina un backup da un file locale
     */
    $('#btn-restore-backup-locally').on('click', async () => {
        const custom_password = $('#backup-custom-password').val();
        const backup_file = document.getElementById('backup-file').files[0];
        // ---
        if (await BackupService.restore_locally(backup_file, custom_password === ''? null : custom_password)) {
            Log.summon(0, "Backup restored successfully");
        } else {
            Log.summon(1, "Error restoring backup");
        }
    });
});

class BackupUI {
    
}