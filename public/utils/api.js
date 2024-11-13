import { CError } from "./error.js";

export class API {
    /**
     * Eseguo una richiesta fetch centralizzata con endpoint, opzioni e tipo di dato.
     * @param {string} endpoint - L'endpoint a cui fare la richiesta.
     * @param {Object} options - Le opzioni da utilizzare nella chiamata fetch.
     * @param {string} return_type - Il tipo di dato da restituire: 'text', 'json', o 'binario'.
     * @returns {Promise<any|null>} - Restituisco il risultato della chiamata o null in caso di errore.
     */
    static async fetch(endpoint, options = {}, return_type = 'json') {
        try {
            // -- Imposto il Content-Type di default a 'application/json' se non già specificato
            options.headers = options.headers || {};
            options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';
            options.body = JSON.stringify(options.body);
            // -- Eseguo la chiamata fetch all'endpoint fornito con le opzioni specificate
            const response = await fetch(endpoint, options);
            // -- Controllo se la risposta è valida (status OK)
            if (!response.ok) {
                // -- Se c'è un errore nella risposta, lo loggo in console e restituisco null
                const error = {
                    status: response.status,
                    status_text: response.statusText,
                    error: (await response.json()).error
                };
                console.warn(`Errore nella fetch:`, error);
                CError.check(error);
                return null;
            }
            // -- Estraggo e restituisco il dato in base al tipo richiesto
            switch (return_type) {
                case 'text':
                    return await response.text();
                case 'json':
                    return await response.json();
                case 'binario':
                    return await response.arrayBuffer();
                default:
                    console.warn("Tipo di dato non supportato.");
                    return null;
            }
        } catch (error) {
            // -- Se c'è un errore durante la chiamata fetch, lo loggo in console e restituisco null
            console.warn(`Fetch Error: ${error.message}`);
            return null;
        }
    }
}