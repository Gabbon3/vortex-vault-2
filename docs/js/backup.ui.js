import { BackupService } from "../service/backup.service.js";
import { Log } from "../utils/log.js";
import { Form } from "../utils/form.js";
import { Windows } from "../utils/windows.js";

document.addEventListener('DOMContentLoaded', () => {
    // crea backup su server
    document.querySelector('#btn-create-backup').addEventListener('click', async () => {
        if (!confirm('Are you sure you want to create new backup, you will replace the current one if theres another?')) return;
        // ---
        Windows.loader(true);
        if (await BackupService.create()) {
            Log.summon(0, "Backup creato e scaricato con successo");
        } else {
            Log.summon(1, "Errore durante la creazione del backup");
        }
        Windows.loader(false);
    });
    /**
     * RESTORE
     */
    document.querySelector('#btn-restore-backup-server').addEventListener('click', async () => {
        if (!confirm('Sei sicuro di voler ripristinare tutti i dati dal vecchio backup? Tutti i dati attuali verranno sovrascritti?')) return;
        // ---
        Windows.loader(true, "Sto decrittografando e ripristinando i dati");
        if (await BackupService.restore_server()) {
            Log.summon(0, "Backup ripristinato con successo");
        } else {
            Log.summon(1, "Errore durante il ripristino del backup");
        }
        Windows.loader(false);
    });
    /**
     * Genera e scarica un file di backup
     */
    Form.register('form-create-backup-locally', async (form, elements) => {
        const { key, key_r } = elements;
        // ---
        if (key !== key_r) return Log.summon(1, "La password personalizzata non coincide");
        // ---
        await BackupService.create_locally(key === '' ? null : key);
        form.reset();
    });
    /**
     * Ripristina un backup da un file locale
     */
    Form.register('form-restore-backup-from-file', async (form, elements) => {
        const { key, backup_file } = elements;
        // ---
        Windows.loader(true, "Sto decrittografando e ripristinando tutti i dati dal tuo file");
        if (await BackupService.restore_locally(backup_file, key === ''? null : key)) {
            Log.summon(0, "Backup ripristinato con successo");
            form.reset();
        } else {
            Log.summon(1, "Errore durante il ripristino del backup");
        }
        Windows.loader(false);
    });
});