import { async_handler } from "../helpers/asyncHandler.js";
import { RamDB } from "../config/ramdb.js";
import { CError } from "../helpers/cError.js";
import { v7 as uuidv7 } from 'uuid';

export class SecureLinkController {
    constructor() { }
    /**
     * Genera l'id del link sicuro memorizzando informazioni
     * cifrate nel RamDB
     */
    generate_secret = async_handler(async (req, res) => {
        const { id: provided_id, scope, ttl, data, passKey } = req.body;
        // ---
        const id = provided_id ?? uuidv7();
        // -- imposto sul ramdb
        const is_set = 
            RamDB.set(`${scope}sl${id}`, data, ttl)
            && passKey ? RamDB.set(`pk${id}`, true, 120) : true; // pk = pass key
        if (!is_set) throw new Error("RamDB error");
        console.log("SL - new item, scope: " + scope);
        // --
        res.status(201).json({ id });
    });
    /**
     * Prepara uno spazio sul ram db
     */
    generate_id = async_handler(async (req, res) => {
        const id = uuidv7();
        console.log('SL - new id request: ' + id);
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
        console.log("SL - get item, scope: " + scope);
        // --
        res.status(200).json({ data });
    });
}