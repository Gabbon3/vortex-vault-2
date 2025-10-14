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
        const { sid, uid: userId } = req.payload;
        // ---
        Validator.of(sid, "Id sessione").uuid();
        Validator.of(userId, "Id utente").uuid();
        // ---
        const sessions = await this.service.getAllSession(sid, userId);
        res.status(200).json(sessions);
    });

    /**
     * Modifica il nome di un dispositivo associato ad una sessione
     */
    editDeviceName = asyncHandler(async (req, res) => {
        const { sid } = req.params;
        const { name } = req.body;
        // ---
        Validator.of(sid, "Id sessione").uuid();
        Validator.of(name, "Nome dispositivo").string().min(3).max(20);
        // ---
        const [affectedCount] = await this.service.update({ sid: sid, user_id: req.payload.uid }, { device_name: name });
        res.status(200).json({ count: affectedCount });
    });

    /**
     * Elimina una sessione specifica
     */
    deleteSession = asyncHandler(async (req, res) => {
        const { sid } = req.params;
        // ---
        Validator.of(sid, "Id sessione").uuid();
        // -- verifico che non sia la sessione corrente
        if (sid === req.payload.sid) throw new CError("", "Non è possibile eliminare la sessione corrente, per farlo devi effettuare il logout.", 400);
        // ---
        const deleted = await this.service.delete({ sid: sid, user_id: req.payload.uid });
        res.status(200).json({ count: deleted });
    });

    /**
     * Elimina tutte le sessioni tranne la corrente
     */
    deleteAllSession = asyncHandler(async (req, res) => {
        const deleted = await this.service.deleteAll({ sid: req.payload.sid, user_id: req.payload.uid });
        res.status(200).json({ count: deleted });
    });
}