import { UAParser } from "ua-parser-js";

/**
 * Restituisce le informazioni essenziali del dispositivo che effettua la request
 * @param {Request} req user agent della request
 * @returns {string}
 */
export const getUserAgentSummary = (req) => {
    const ua = UAParser(req.get("user-agent"));
    return `${req.isExtension ? 'Extension ' : ''}${ua.os.name ?? ""} ${ua.os.version ?? ""} - ${ua.browser.name ?? ""} ${ua.browser.major ?? ""}`;
}