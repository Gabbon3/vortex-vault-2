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
        const { backup: backup_base64 } = req.body; // è in base64
        // ---
        if (!backup_base64)
            throw new CError("ValidationError", "No backup", 422);
        // -- riconverto da base 64 a bytes
        const backup_bytes = Buffer.from(backup_base64, "base64");
        // ---
        const backup = await this.service.create(backup_bytes, req.user.uid);
        // ---
        res.status(201).json(backup);
    });
    /**
     * Ottieni un backup dal suo id
     * @param {Request} req
     * @param {Response} res
     */
    get_id = async_handler(async (req, res) => {
        const { backup_id } = req.params;
        // ---
        const vault = await this.service.get_id(backup_id, req.user.uid);
        // ---
        if (!vault)
            throw new CError("NotFoundError", "Backup non trovato", 404);
        res.status(200).json(vault);
    });
    /**
     * Ottieni tutti i backup
     * @param {Request} req 
     * @param {Response} res 
     */
    get = async_handler(async (req, res) => {
        const vaults = await this.service.get(req.user.uid);
        res.status(200).json(vaults);
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