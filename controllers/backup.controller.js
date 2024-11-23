import { BackupService } from "../services/backup.service.js";
import { CError } from "../helpers/cError.js";
import { async_handler } from "../helpers/asyncHandler.js";

export class BackupController {
    constructor() {
        this.service = new BackupService();
    }
    /**
     * Crea un nuovo backup
     * @param {Request} req
     * @param {Response} res
     */
    create = async_handler(async (req, res) => {
        const backup_bytes = req.body; // è in base64
        // ---
        if (!backup_bytes)
            throw new CError("ValidationError", "No backup", 422);
        // -- elimino il vecchio backup
        await this.service.delete_all(req.user.uid);
        // ---
        const backup = await this.service.create(backup_bytes, req.user.uid);
        // ---
        if (!backup) throw new CError("CreationError", "Error while saving new backup", 500);
        // ---
        res.status(201).json({ "id": backup.id });
    });
    /**
     * Ottieni un backup dal suo id
     * @param {Request} req
     * @param {Response} res
     */
    get_id = async_handler(async (req, res) => {
        const { backup_id } = req.params;
        // ---
        const backup = await this.service.get_id(backup_id, req.user.uid);
        // ---
        if (!backup)
            throw new CError("NotFoundError", "Backup non trovato", 404);
        res.status(200).json(backup);
    });
    /**
     * Ottieni tutti i backup
     * @param {Request} req 
     * @param {Response} res 
     */
    get = async_handler(async (req, res) => {
        const backups = await this.service.get(req.user.uid);
        res.status(200).json(backups);
    });
    /**
     * Elimina un backup
     * @param {Request} req 
     * @param {Response} res 
     */
    delete = async_handler(async (req, res) => {
        const { backup_id } = req.params;
        // ---
        const deleted = await this.service.delete(backup_id, req.user.uid);
        if (!deleted) throw new CError("NotFoundError", "Backup non trovato", 404);
        res.sendStatus(200);
    });
}