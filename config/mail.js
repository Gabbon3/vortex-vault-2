import nodemailer from 'nodemailer';
import { Cripto } from '../utils/cryptoUtils.js';
import 'dotenv/config';
import { Bytes } from '../utils/bytes.js';

export class Mailer {
    static fish_key = Buffer.from(process.env.FISH_SECRET, "hex");
    /**
     * Configurazione per il trasporto
     */
    static transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
    /**
     * Genera un codice di verifica da includere nelle mail per legittimare la mail
     * @param {string} email 
     * @returns {string}
     */
    static generate_antiphish_code(email) {
        const payload = `${email.split('@')[0]}.${Date.now()}`;
        const signature = Cripto.hmac(payload, this.fish_key);
        // ---
        const encoded_signature = Bytes.base64.to(signature, true);
        return `${payload}.${encoded_signature}`;
    }
    /**
     * Verifica la validità di un codice di verifica anti phishing
     * @param {string} code 
     * @returns {number} 1 codice e data validi, 2 codice valido ma scaduto, 3 codice non valido
     */
    static verify_antiphish_code(code) {
        const code_parts = code.split('.');
        // ----
        const encoded_signature = Bytes.base64.from(code_parts.pop(), true);
        // ---
        const payload = code_parts.join('.');
        // ---
        const date = Number(code_parts.pop());
        // -- calcolo nuovamente la signature
        const signature = Cripto.hmac(payload, this.fish_key);
        // -- verifico le condizioni
        const valid_signature = Bytes.compare(signature, encoded_signature);
        const valid_date = Date.now() < new Date(date + (24 * 60 * 60 * 1000));
        // ---
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
                from: process.env.EMAIL_USER,
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