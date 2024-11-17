import { async_handler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import { UserService } from "../services/user.service.js";
import { VaultService } from "../services/vaultService.js";

export class VaultController {
    constructor() {
        this.service = new VaultService();
        this.user_service = new UserService();
    }
    /**
     * Crea un nuovo vault
     * @param {Request} req 
     * @param {Response} res 
     */
    create = async_handler(async (req, res) => {
        const { secrets } = req.body; // è in base64
        // ---
        if (!secrets) throw new CError("ValidationError", "No secrets", 422);
        // -- riconverto da base 64 a bytes
        const secrets_bytes = Buffer.from(secrets, 'base64');
        // ---
        const vault = await this.service.create(req.user.uid, secrets_bytes);
        // -- aggiorno l'ultimo update del vault dell'utente
        this.user_service.update_user_info(req.user.uid, { vault_update: new Date() });
        // ---
        res.status(201).json(vault);
    });
    /**
     * Ottieni un vault dal suo id
     * @param {Request} req 
     * @param {Response} res 
     */
    get_id = async_handler(async (req, res) => {
        const { vault_id } = req.params;
        // ---
        const vault = await this.service.get_id(req.user.uid, vault_id);
        // ---
        if (!vault) throw new CError("NotFoundError", "Vault non trovato", 404);
        res.status(200).json(vault);
    });
    /**
     * Ottieni tutti o alcuni vault in base alla data di update
     * @param {Request} req 
     * @param {Response} res 
     */
    get = async_handler(async (req, res) => {
        let updated_after = req.query.updated_after ?? null;
        if (updated_after) updated_after = new Date(updated_after);
        // ---
        const vaults = await this.service.get(req.user.uid, updated_after);
        res.status(200).json(vaults);
    });
    /**
     * Conta il numero di 
     * @param {Request} req 
     * @param {Response} res 
     */
    count = async_handler(async (req, res) => {
        const count = await this.service.count(req.user.uid);
        return res.status(200).json({ count });
    });
    /**
     * Aggiorna un vault
     * @param {Request} req 
     * @param {Response} res 
     */
    update = async_handler(async (req, res) => {
        const { vault_id, secrets } = req.body;
        // -- riconverto da base 64 a bytes
        const secrets_bytes = Buffer.from(secrets, 'base64');
        // ---
        const vault = await this.service.update(req.user.uid, vault_id, secrets_bytes);
        if (!vault) throw new CError("NotFoundError", "Vault non trovato", 404);
        res.status(200).json(vault);
    });
    /**
     * Elimina un vault
     * @param {Request} req 
     * @param {Response} res 
     */
    delete = async_handler(async (req, res) => {
        const { vault_id } = req.params;
        // ---
        const deleted = await this.service.delete(req.user.uid, vault_id);
        if (!deleted) throw new CError("NotFoundError", "Vault non trovato", 404);
        res.sendStatus(200);
    });
}