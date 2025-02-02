import nodemailer from 'nodemailer';
import { Cripto } from '../utils/cryptoUtils.js';
import { Bytes } from '../utils/bytes.js';
import { BaseConverter } from '../utils/baseConverter.js';
import { Config } from '../server_config.js';

export class Mailer {
    /**
     * Configurazione per il trasporto
     */
    static transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: Config.EMAIL_USER,
            pass: Config.EMAIL_PASSWORD,
        }
    });
    /**
     * Genera un codice di verifica da includere nelle mail per legittimare la mail
     * @param {string} email_
     * @returns {string}
     */
    static message_authentication_code(email_) {
        let [email, timestamp] = [email_.split('@')[0], Math.floor(Date.now() / 1000)];
        // -- comprimo e riduco la dimensione dei dati
        timestamp = BaseConverter.to_string(timestamp, 62);
        // ---
        const payload = `${email}.${timestamp}`;
        const signature = Cripto.hmac(payload, Config.FISH_KEY);
        // ---
        const encoded_signature = Bytes.base62.encode(signature.subarray(0, 12), true);
        return `${payload}.${encoded_signature}`;
    }
    /**
     * Verifica la validità di un codice di verifica anti phishing
     * @param {string} email 
     * @param {string} code 
     * @returns {number} 1 codice e data validi, 2 codice valido ma scaduto, 3 codice non valido, 4 ricevente diverso da quello indicato
     */
    static verify_message_authentication_code(email, code) {
        const code_parts = code.split('.');
        // -- decodifico la firma in binario
        const encoded_signature = Bytes.base62.decode(code_parts.pop());
        // -- reimposto il payload
        const payload = code_parts.join('.');
        // -- ottengo il mittente
        const email_id = email.split('@')[0].split('.')[0];
        const receiver = code_parts.shift();
        // -- ottengo la data per fare il confronto temporale
        const date = Number(BaseConverter.from_string(code_parts.pop(), 62)) * 1000;
        // -- calcolo nuovamente la signature
        const signature = Cripto.hmac(payload, Config.FISH_KEY);
        // -- verifico le condizioni
        const valid_signature = Bytes.compare(signature.subarray(0, 12), encoded_signature);
        const valid_date = Date.now() < new Date(date + (24 * 60 * 60 * 1000));
        // -- controllo se il ricevente corrisponde
        if (email_id !== receiver && valid_signature) return 4; // ricevente diverso da quello presente nel codice
        return valid_signature ? (valid_date ? 1 : 2) : 3;
    }
    /**
     * Invia una mail
     * @param {string} to 
     * @param {string} subject 
     * @param {string} text 
     * @returns {{status: boolean, message?: string, error?:string}}
     * @example
     * await Mailer.send(
     *   "destinatario@example.com",
     *   "Oggetto dell'email",
     *   "Ciao, questa è un'email di test inviata con Nodemailer!"
     * );
     */
    static async send(to, subject, text, html) {
        try {
            const mail_options = {
                from: Config.EMAIL_USER,
                to,
                subject,
                text,
                html
            };
            const info = await this.transporter.sendMail(mail_options);
            return { status: true, message: info.response };
        } catch (error) {
            console.warn("MAIL ERROR: ", error);
            return { status: false, error: error.message };
        }
    }
}