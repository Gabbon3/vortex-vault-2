import { asyncHandler } from "../helpers/asyncHandler.js";
import { CError } from "../helpers/cError.js";
import msgpack from "../docs/utils/msgpack.min.js";
import { UserService } from "../services/user.service.js";
import { VaultService } from "../services/vault.service.js";

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
    create = asyncHandler(async (req, res) => {
        const { secrets } = req.body; // è in base64
        // ---
        if (!secrets) throw new CError("ValidationError", "No secrets", 422);
        // -- riconverto da base 64 a bytes
        const secrets_bytes = Buffer.from(secrets, 'base64');
        // ---
        const vault = await this.service.create(req.payload.uid, secrets_bytes);
        // ---
        res.status(201).json({ id: vault.id });
    });
    /**
     * Ottieni un vault dal suo id
     * @param {Request} req 
     * @param {Response} res 
     */
    get_id = asyncHandler(async (req, res) => {
        const { vault_id } = req.params;
        // ---
        const vault = await this.service.get_id(req.payload.uid, vault_id);
        // ---
        if (!vault) throw new CError("NotFoundError", "Vault non trovato", 404);
        res.status(200).json(vault);
    });
    /**
     * Ottieni tutti o alcuni vault in base alla data di update
     * @param {Request} req 
     * @param {Response} res 
     */
    get = asyncHandler(async (req, res) => {
        let updated_after = req.query.updated_after ?? null;
        if (updated_after) updated_after = new Date(updated_after);
        // ---
        const vaults = await this.service.get(req.payload.uid, updated_after);
        res.status(200).json(vaults);
    });
    /**
     * Aggiorna un vault
     * @param {Request} req 
     * @param {Response} res 
     */
    update = asyncHandler(async (req, res) => {
        const { vault_id, secrets } = req.body;
        // -- riconverto da base 64 a bytes
        const secretsBytes = Buffer.from(secrets, 'base64');
        // ---
        const vault = await this.service.update(req.payload.uid, vault_id, secretsBytes);
        if (!vault) throw new CError("NotFoundError", "Vault non trovato", 404);
        res.status(200).json(vault);
    });
    /**
     * Esegue il restore di tutti i vault
     * elimina i precedenti e li sostituisce con quelli nuovi
     * @param {Request} req 
     * @param {Response} res 
     */
    restore = asyncHandler(async (req, res) => {
        const packed_vaults = req.body;
        const vaults = msgpack.decode(packed_vaults);
        // ---
        const restored = await this.service.restore(req.payload.uid, vaults);
        if (!restored) throw new CError("RestoreFailed", "Error during restore of vaults", 500);
        // ---
        res.status(201).json({ message: "Vaults restored" });
    });
    /**
     * Elimina un vault
     * @param {Request} req 
     * @param {Response} res 
     */
    delete = asyncHandler(async (req, res) => {
        const { vault_id } = req.params;
        // ---
        const deleted = await this.service.delete(req.payload.uid, vault_id);
        if (!deleted) throw new CError("NotFoundError", "Vault non trovato", 404);
        res.sendStatus(200);
    });
}