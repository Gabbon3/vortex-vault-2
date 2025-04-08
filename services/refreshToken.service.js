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
        // -- genero il token casualmente 32 byte
        const plain_token = Cripto.random_bytes(32, 'hex');
        // ---
        const token_hash = this.get_token_digest(plain_token);
        // ---
        const token = await RefreshToken.create({
            token_hash,
            user_id,
            user_agent_summary,
            user_agent_hash,
            ip_address: ip_address ?? '',
            is_revoked: revoke_this_token
        });
        // -- aggiungo il token non hashato
        token.plain = plain_token;
        // ---
        return token ? token : null;
    }
    /**
     * Aggiorna qualsiasi campo di un token 
     * @param {object} where_conditions - oggetto con le condizioni per trovare il token (tipo uid, id o token_hash)
     * @param {Object} updated_info un oggetto con le informazioni da modificare
     * @returns
     */
    async update_token_info(where_conditions, updated_info) {
        return await RefreshToken.update(
            updated_info,
            { where: where_conditions }
        );
    }
    /**
     * Revoca no un token
     * @param {object} where
     * @param {boolean} is_revoked
     */
    async revoke(where, is_revoked) {
        return await RefreshToken.update(
            { is_revoked },
            { where }
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
        const hash_current = this.get_token_digest(current_token_id);
        const tokens = await RefreshToken.findAll({
            where: { user_id },
            attributes: {
                exclude: ['user_id', 'user_agent_hash']
            }
        });
        // -- converto in json e verifico per ogni token se l'id corrisponde a quello corrente
        const tokens_json = tokens.map(token => {
            const token_json = token.get();
            token_json.current = token_json.id === hash_current;
            return token_json;
        });
        // ---
        return tokens_json;
    }
    /**
     * Restituisce la public key associata ad un refresh token
     * @param {string} uid 
     * @param {object} where_conditions 
     * @returns {string} chiave pubblica in base 64
     */
    async get_public_key(where_conditions) {
        this.digest_where_token_hash(where_conditions);
        // ---
        const device = await RefreshToken.findOne({
            where: where_conditions,
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
     * @param {object} where_conditions - oggetto per trovare il token (user_id, token_hash, id)
     * @param {string} user_agent
     * @returns {boolean | Object}
     */
    async verify(where_conditions, user_agent) {
        // ---
        const refresh_token = await RefreshToken.findOne({ where_conditions });
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
     * Effettua l'hash del token
     */
    digest_where_token_hash(where) {
        if (!where.token_hash) return;
        where.token_hash = this.get_token_digest(where.token_hash);
    }
    /**
     * Restituisce il token hashato
     * @param {string} token 
     * @returns {string}
     */
    get_token_digest(token) {
        return Cripto.hash(token, { algorithm: 'sha256', encoding: 'hex' });
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
