import { asyncHandler } from "../helpers/asyncHandler.js";
import { RedisDB } from "../config/redisdb.js";
import { CError } from "../helpers/cError.js";
import { v7 as uuidv7 } from 'uuid';

export class SecureLinkController {
    constructor() { }
    /**
     * Genera l'id del link sicuro memorizzando informazioni
     * cifrate nel RedisDB
     */
    generate_secret = asyncHandler(async (req, res) => {
        const { id: provided_id, scope, ttl, data } = req.body;
        // ---
        const id = provided_id ?? uuidv7();
        // -- imposto sul ramdb
        const is_set = await RedisDB.set(`${scope}sl${id}`, data, ttl);
        if (!is_set) throw new Error("RedisDB error");
        // --
        res.status(201).json({ id });
    });
    /**
     * Prepara uno spazio sul ram db
     */
    generate_id = asyncHandler(async (req, res) => {
        const id = uuidv7();
        // --
        res.status(201).json({ id });
    });
    /**
     * Restituisce un segreto memorizzato sul RedisDB
     */
    get_secret = asyncHandler(async (req, res) => {
        const { scope_id } = req.params;
        const [scope, id] = scope_id.split("_");
        // ---
        const data = await RedisDB.get(`${scope}sl${id}`); // sl = secure link
        if (!data) throw new CError("NotFoundError", "Not found", 404);
        await RedisDB.delete(`${scope}sl${id}`);
        // --
        res.status(200).json({ data });
    });
}