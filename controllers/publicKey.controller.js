import { asyncHandler } from "../helpers/asyncHandler.js";
import { PublicKeyService } from "../services/publicKey.service.js";
import { CError } from "../helpers/cError.js";
import { Validator } from "../utils/validator.js";

export class PublicKeyController {
    constructor() {
        this.service = new PublicKeyService();
    }

    /**
     * Restituisce la lista di tutte le sessioni legate ad un utente
     */
    getAllSession = asyncHandler(async (req, res) => {
        const { jti: id, uid: userId } = req.payload;
        // ---
        Validator.of(id, "Id sessione").uuid();
        Validator.of(userId, "Id utente").uuid();
        // ---
        const sessions = await this.service.getAllSession(id, userId);
        res.status(200).json(sessions);
    });

    /**
     * Modifica il nome di un dispositivo associato ad una sessione
     */
    editDeviceName = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { name } = req.body;
        // ---
        Validator.of(id, "Id sessione").uuid();
        Validator.of(name, "Nome dispositivo").string().min(3).max(20);
        // ---
        const [affectedCount] = await this.service.update({ id: id, user_id: req.payload.uid }, { device_name: name });
        res.status(200).json({ count: affectedCount });
    });

    /**
     * Elimina una sessione specifica
     */
    deleteSession = asyncHandler(async (req, res) => {
        const { id } = req.params;
        // ---
        Validator.of(id, "Id sessione").uuid();
        // -- verifico che non sia la sessione corrente
        if (id === req.payload.jti) throw new CError("", "Non è possibile eliminare la sessione corrente, per farlo devi effettuare il logout.", 400);
        // ---
        const deleted = await this.service.delete({ id: id, user_id: req.payload.uid });
        res.status(200).json({ count: deleted });
    });

    /**
     * Elimina tutte le sessioni tranne la corrente
     */
    deleteAllSession = asyncHandler(async (req, res) => {
        const deleted = await this.service.deleteAll({ kid: req.payload.jti, user_id: req.payload.uid });
        res.status(200).json({ count: deleted });
    });
}