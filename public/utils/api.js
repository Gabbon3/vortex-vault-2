import { finestra } from "../components/main.components.js";
import { CError } from "./error.js";

export class API {
    /**
     * Eseguo una richiesta fetch centralizzata con endpoint, opzioni e tipo di dato.
     * @param {string} endpoint - L'endpoint a cui fare la richiesta.
     * @param {Object} options - Le opzioni da utilizzare nella chiamata fetch.
     * @param {Object} type - Contiene i tipi di ritorno e contenuto: { return_type, content_type }.
     * @returns {Promise<any|null>} - Restituisco il risultato della chiamata o null in caso di errore.
     */
    static async fetch(endpoint, options = {}, type = {}) {
        try {
            // -- imposto le intestazioni e il tipo di contenuto per la richiesta
            options.headers = options.headers || {};
            type.content_type = type.content_type || 'json';
            type.return_type = type.return_type || 'json';
            // -- gestisco il corpo della richiesta in base al tipo di contenuto
            switch (type.content_type) {
                case 'json':
                    options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';
                    options.body = JSON.stringify(options.body); // -- serializzo il corpo in JSON
                    break;
                // ---
                case 'form-data':
                    options.headers['Content-Type'] = options.headers['Content-Type'] || 'multipart/form-data';
                    options.body = this.toFormData(options.body); // -- converto il corpo in FormData
                    break;
                // ---
                case 'bin':
                    options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/octet-stream';
                    options.body = options.body; // -- corpo già in formato binario
                    break;
                // ---
                default:
                    // -- tipo di contenuto non gestito
                    console.warn("tipo di contenuto non gestito.");
                    return null;
            }
            // -- eseguo la chiamata fetch all'endpoint con le opzioni fornite
            const response = await fetch(endpoint, options);
            // -- controllo se la risposta è valida
            if (!response.ok) {
                const error = {
                    status: response.status,
                    status_text: response.statusText,
                    error: (await response.json()).error
                };
                console.warn(`errore nella fetch:`, error);
                CError.check(error); // -- lancio un errore se la risposta non è valida
                return null;
            }
            // -- restituisco il dato in base al tipo di ritorno richiesto
            switch (type.return_type) {
                case 'text':
                    return await response.text();
                case 'json':
                    return await response.json();
                case 'binario':
                    return await response.arrayBuffer();
                default:
                    // -- tipo di dato non supportato
                    console.warn("tipo di dato non supportato.");
                    return null;
            }
        } catch (error) {
            finestra.loader(false);
            // -- gestisco eventuali errori nella chiamata
            console.warn(`fetch error: ${error.message}`);
            return null;
        }
    }

    /**
     * Converto un oggetto in FormData
     * @param {Object} obj - Oggetto da convertire in FormData.
     * @returns {FormData} - Oggetto FormData creato.
     */
    static toFormData(obj) {
        const formData = new FormData();
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                formData.append(key, obj[key]);
            }
        }
        return formData;
    }
}

window.API = API;