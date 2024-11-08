import msgpack from "msgpack-lite";

/**
 * Middleware per decodificare i dati binari pacchettizzati con msgpack.
 * @param {Request} req - L'oggetto richiesta di Express.
 * @param {Response} res - L'oggetto risposta di Express.
 * @param {Function} next - Funzione che passa al prossimo middleware.
 */
export const binBodyParser = (req, res, next) => {
    // -- verifico se il tipo di contenuto è "application/octet-stream" quindi binario
    if (req.get("Content-Type") !== "application/octet-stream") {
        return res.status(400).json({ 
            error: "Invalid content type",
            message: "Expected Content-Type: application/octet-stream"
        });
    }
    // -- verifico se il corpo è vuoto
    if (!req.body.length) {
        return res.status(400).json({ error: "Body is empty" });
    }
    // -- provo a decodificare il body
    try {
        req.body = msgpack.decode(req.body);
        next();
    } catch (error) {
        res.status(400).json({ error: "Invalid msgpack data" });
    }
};