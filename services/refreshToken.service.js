import { UAParser } from "ua-parser-js";
import { RefreshToken } from "../models/refreshToken.js";
import { Cripto } from "../utils/cryptoUtils.js";
import { RamDB } from "../config/ramdb.js";
import { validate as uuidValidate } from 'uuid';
import { Bytes } from "../utils/bytes.js";
import { CError } from "../helpers/cError.js";

export class RefreshTokenService {
    static random_c_length = 10;
    /**
     * Crea un nuovo refresh token salvandolo sul db e restituendolo
     * @param {string} user_id
     * @param {string} user_agent
     * @param {string} ip_address
     * @returns {string}
     */
    async create(user_id, user_agent, ip_address, passKey) {
        // -- User Agent
        const ua = UAParser(user_agent);
        const user_agent_summary = `${ua.browser.name ?? ""}-${ua.browser.major ?? ""}-${ua.os.name ?? ""}-${ua.os.version ?? ""}`;
        const user_agent_hash = this.user_agent_hash(user_agent);
        // -- verifico se la passKey è valida
        const is_valid_passkey = RamDB.get(`pk${passKey}`);
        let count = 0;
        // - se è valida elimino la chiave e lascio il refresh token valido
        if (is_valid_passkey) RamDB.delete(`pk${passKey}`);
        else count = await this.count(user_id);
        // -- conto i refresh token
        // -- se non ci sono token associati quindi si tratta del primo accesso
        // -- abilito il token, se no bisogna approvarlo
        const revoke_this_token = count > 0;
        // ---
        const token = await RefreshToken.create({
            user_id,
            user_agent_summary,
            user_agent_hash,
            ip_address: ip_address ?? '',
            is_revoked: revoke_this_token
        });
        // ---
        return token ? token : null;
    }
    /**
     * Aggiorna qualsiasi campo di un token 
     * @param {string} uid user id 
     * @param {string} token_id 
     * @param {Object} updated_info un oggetto con le informazioni da modificare
     * @returns
     */
    async update_token_info(uid, token_id, updated_info) {
        const where = { id: token_id, user_id: uid };
        // if (uid) where.user_id = uid;
        // ---
        return await RefreshToken.update(
            updated_info,
            { where }
        );
    }
    /**
     * Revoca no un token
     * @param {string} token_id
     * @param {boolean} is_revoked
     */
    async revoke(token_id, is_revoked) {
        return await RefreshToken.update(
            { is_revoked },
            { where: { id: token_id } }
        );
    }
    /**
     * Revoca tutti i token associati ad un utente
     * @param {string} user_id
     * @returns
     */
    async revoke_all(user_id) {
        return await RefreshToken.update(
            { is_revoked: true },
            { where: { user_id } }
        );
    }
    /**
     * Restituisce il numero totale di refresh token associati ad un utente
     * @param {number} user_id 
     * @returns {number}
     */
    async count(user_id) {
        return await RefreshToken.count({
            where: {
                user_id
            }
        });
    }
    /**
     * Restituisce tutti i token associati ad un utente
     * @param {string} user_id
     * @returns
     */
    async get_all(user_id, current_token_id) {
        const tokens = await RefreshToken.findAll({
            where: { user_id },
            attributes: {
                exclude: ['user_id', 'user_agent_hash']
            }
        });
        // -- converto in json e verifico per ogni token se l'id corrisponde a quello corrente
        const tokens_json = tokens.map(token => {
            const token_json = token.get();
            token_json.current = token_json.id === current_token_id;
            return token_json;
        });
        // ---
        return tokens_json;
    }
    /**
     * Restituisce la public key associata ad un refresh token
     * @param {string} uid 
     * @param {string} token_id 
     * @returns {string} chiave pubblica in base 64
     */
    async get_public_key(uid, token_id) {
        const device = await RefreshToken.findOne({
            where: { user_id: uid, id: token_id },
            attributes: ['public_key']
        });
        // ---
        if (!device) throw new CError("", "Public Key not found", 404);
        if (!device.public_key) throw new CError("", "Public Key not found", 404);
        // ---
        return device.public_key;
    }
    /**
     * Elimina tutti i token associati ad un utente e ad un dispositivo
     * utile per non accumulare token sullo stesso dispositivo
     * @param {string} user_id
     * @param {string} user_agent_hash
     * @returns
     */
    async delete_old_tokens(user_id, user_agent_hash) {
        return await RefreshToken.destroy({
            where: {
                user_id,
                user_agent_hash,
            },
        });
    }
    /**
     * Elimina un token
     * @param {string} token_id 
     * @param {number} user_id 
     * @returns 
     */
    async delete(token_id, user_id) {
        if (!uuidValidate(token_id)) return false;
        // ---
        return await RefreshToken.destroy({
            where: {
                id: token_id,
                user_id,
            },
        });
    }
    /**
     * Verifica la validità dei refresh token restituendo le informazioni associate se valido
     * @param {string} uid user id
     * @param {string} token_id
     * @param {string} user_agent
     * @returns {boolean | Object}
     */
    async verify(uid, token_id, user_agent) {
        const where = { id: token_id };
        if (uid) where.user_id = uid;
        // ---
        const refresh_token = await RefreshToken.findOne({ where });
        // -- se il token non esiste o non è associato a quell'utente non è valido
        if (!refresh_token) return false;
        // -- se il token è stato revocato non è valido
        if (refresh_token.is_revoked === true) return false;
        // -- se il token è inutilizzato da piu di 30 giorni non è piu valido
        const scadenza =
            refresh_token.last_used_at.getTime() + this.max_tempo_inattivita;
        if (scadenza < Date.now()) return false;
        // -- se l'user agent non corrisponde non è valido, rimosso poichè superfluo
        // const user_agent_hash = this.user_agent_hash(user_agent);
        // if (user_agent_hash != refresh_token.user_agent_hash) return false;
        // ---
        return refresh_token;
    }
    /**
     * Crea l'hash MD5 dell'user agent restituendo in formato hex
     * @param {string} user_agent
     * @returns {string} hex string
     */
    user_agent_hash(user_agent) {
        return Cripto.hash(user_agent, { algorithm: "md5", encoding: "hex" });
    }
}
