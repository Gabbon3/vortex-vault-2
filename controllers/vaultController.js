import { async_handler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import { VaultService } from "../services/vaultService.js";

export class VaultController {
    constructor() {
        this.service = new VaultService();
    }
    /**
     * Crea un nuovo vault
     * @param {Request} req 
     * @param {Response} res 
     */
    create = async_handler(async (req, res) => {
        const { secrets } = req.body;
        if (!secrets) throw new CError("ValidationError", "No secrets", 422);
        // ---
        const vault = await this.service.create(req.user.uid, secrets);
        res.status(201).json({ vault });
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
        res.status(200).json({ vault });
    });
    /**
     * Ottieni tutti i alcuni vault in base alla data di update
     * @param {Request} req 
     * @param {Response} res 
     */
    get = async_handler(async (req, res) => {
        const updated_after = req.body.updated_after ?? null;
        // ---
        const vaults = await this.service.get(req.user.uid, updated_after);
        res.status(200).json({ vaults });
    });
    /**
     * Aggiorna un vault
     * @param {Request} req 
     * @param {Response} res 
     */
    update = async_handler(async (req, res) => {
        const { vault_id, secrets } = req.body;
        // ---
        const vault = await this.service.update(req.user.uid, vault_id, secrets);
        if (!vault) throw new CError("NotFoundError", "Vault non trovato", 404);
        res.status(200).json({ vault });
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