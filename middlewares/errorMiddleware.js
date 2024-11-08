import { CError } from "../helpers/cError.js";

/**
 * Gestione degli errori centralizzata
 * @param {CError | Error} error 
 * @param {Request} req 
 * @param {Response} res 
 * @param {NextFunction} next 
 * @returns 
 */
export const error_handler_middleware = async (error, req, res, next) => {
    if (error instanceof CError) {
        return res.status(error.status_code).json({ error: error.message });
    }
    // -- gestione di altri errori generici
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
};