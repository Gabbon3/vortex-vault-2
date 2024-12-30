import { async_handler } from "../helpers/asyncHandler.js";
import { RamDB } from "../config/ramdb.js";
import { CError } from "../helpers/cError.js";
import { UID } from "../utils/uid.js";

export class SecureTransferController {
    constructor() { }
    /**
     * Genera l'id del link sicuro memorizzando informazioni
     * cifrate nel RamDB
     */
    set = async_handler(async (req, res) => {
        const { request_id, data, ttl, passKey: setPassKey } = req.body;
        // -- genero una passKey
        const passKey = UID.generate(8);
        // -- imposto sul ramdb
        const is_set = 
            RamDB.set(`st${request_id}`, [data, passKey], ttl) // st = secure transfer
            && setPassKey ? RamDB.set(`pk${passKey}`, true, 120) : true;
        if (!is_set) throw new Error("RamDB error");
        // --
        res.status(201).json({ passKey });
    });
    /**
     * Restituisce un segreto memorizzato sul RamDB
     */
    get = async_handler(async (req, res) => {
        const { request_id } = req.params;
        // ---
        const data = RamDB.get(`st${request_id}`);
        if (!data) throw new CError("NotFoundError", "Not found", 404);
        RamDB.delete(`st${request_id}`);
        // --
        res.status(200).json({ data: data[0], passKey: data[1] });
    });
}