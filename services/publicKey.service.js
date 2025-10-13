import { PublicKey } from "../models/publicKey.model.js";
import { Op } from "sequelize";
import { Cripto } from "../utils/cryptoUtils.js";

export class PublicKeyService {
    constructor() {}

    /**
     * Restituisce la lista di tutte le sessioni, segnalando quella corrente
     * @param {string} currentId - id della sessione corrente
     * @param {string} userId 
     * @returns {Array<Object>}
     */
    async getAllSession(currentId, userId) {
        // -- ottengo tutte le sessioni
        const sessions = await PublicKey.findAll({
            where: { user_id: userId },
            attributes: {
                exclude: ['user_id', 'secret']
            }
        });
        // -- converto in json e verifico per ogni token se l'id corrisponde a quello corrente
        const sessionsJson = sessions.map(session => {
            const sessionJson = session.get();
            sessionJson.current = sessionJson.id === currentId;
            return sessionJson;
        });
        // ---
        return sessionsJson;
    }

    /**
     * Crea un nuovo record di Public Key
     * @param {string} id - il jti del token
     * @param {string} userId uuid dell utente
     * @param {string} publicKeyHex chiave pubblica in esadecimale
     * @param {string} ua user agent del dispositivo
     * @param {string} deviceName non obbligatorio: nome del dispositivo
     */
    async create(id, userId, publicKeyHex, ua, deviceName = null) {
        const fingerprint = await new Cripto().hash(publicKeyHex, { encoding: 'hex', algorithm: 'sha256' });
        // ---
        return await PublicKey.create({
            id,
            fingerprint,
            user_id: userId,
            device_name: deviceName,
            device_info: ua,
        });
    }

    /**
     * Effettua l'update di una Public Key
     * @param {Object} conditions * condizioni per effettuare l'update WHERE id = ...
     * @param {*} newInfo * Oggetto che deve essere coerente con gli attributi di PublicKey, che contiene le nuove informazioni
     * @returns {Array} [affectedRows]
     */
    async update(conditions, newInfo) {
        return await PublicKey.update(
            newInfo,
            { where: conditions }
        );
    }

    /**
     * Effettua la cancellazione di una o più AuthKeys in base alle conditions
     * elimina anche da RedisDB
     * @param {Object} conditions * condizioni per WHERE id = ...
     * @returns {number} numero di record eliminati
     */
    async delete(conditions) {
        return await PublicKey.destroy(
            { where: conditions }
        );
    }

    /**
     * Elimina tutte le sessioni tranne la corrente
     * @param {Object} conditions 
     * @param {string} [conditions.id] opzionale, se specificato verranno eliminate tutte le sessioni tranne quella corrente
     * @param {string} [conditions.user_id] obbligatorio, indica lo user id associato alla sessione
     * @returns {number} numero di record eliminati
     */
    async deleteAll(conditions) {
        if (!conditions.user_id) throw new Error('User ID è obbligatorio');
        // -- se presente il guid della sessione viene calcolato il kid
        let idCondition = conditions.id ? { [Op.ne]: conditions.id } : null;
        /**
         * Elimino sul DB
         */
        return await PublicKey.destroy({
            where: {
                user_id: conditions.user_id,
                id: idCondition
            }
        });
    }
}