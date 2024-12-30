import { async_handler } from "../helpers/asyncHandler.js";
import { RamDB } from "../config/ramdb.js";
import { UID } from "../utils/uid.js";
import { CError } from "../helpers/cError.js";

export class SecureLinkController {
    constructor() { }
    /**
     * Genera l'id del link sicuro memorizzando informazioni
     * cifrate nel RamDB
     */
    generate_secret = async_handler(async (req, res) => {
        const { scope, ttl, data, passKey } = req.body;
        // ---
        const id = UID.generate(8);
        // -- imposto sul ramdb
        const is_set = 
            RamDB.set(`${scope}sl${id}`, data, ttl)
            && passKey ? RamDB.set(`pk${id}`, true, ttl) : true; // pk = pass key
        if (!is_set) throw new Error("RamDB error");
        // --
        res.status(201).json({ id });
    });
    /**
     * Restituisce un segreto memorizzato sul RamDB
     */
    get_secret = async_handler(async (req, res) => {
        const { scope_id } = req.params;
        const [scope, id] = scope_id.split("_");
        // ---
        const data = RamDB.get(`${scope}sl${id}`); // sl = secure link
        if (!data) throw new CError("NotFoundError", "Not found", 404);
        RamDB.delete(`${scope}sl${id}`);
        // --
        res.status(200).json({ data });
    });
}