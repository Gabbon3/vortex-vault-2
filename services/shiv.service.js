import { JWT } from "../utils/jwt.utils.js";
import { CError } from "../helpers/cError.js";
import { AuthKeys } from "../models/authKeys.model.js";
import { SHIV } from "../protocols/SHIV.node.js";
import { RedisDB } from "../config/redisdb.js";
import { Op } from "sequelize";

export class ShivService {
    constructor() {
        this.shiv = new SHIV();
    }

    /**
     * Crea un ppt
     * @param {Object} payload - deve avere uid e kid
     * @param {Object} additional - oggetto di informazioni aggiuntive per il ppt
     * @param {number} lifetime - il tempo di vita del ppt, di base 5 minuti
     * @returns {string} - un token formato da un payload che include uid utente + additional info
     */
    async createShivPrivilegedToken({ payload, additional, lifetime = SHIV.pptLifetime } = {}) {
        if (!payload.sub || !payload.kid) throw new Error("Il payload non è conforme, deve avere uid e kid");
        // -- ottengo la chiave
        const signKey = await this.shiv.getSignKey(payload.kid, 'ppt-signing');
        if (!signKey) throw new CError("", "No key founded", 400);
        // ---
        const jsonwebtoken = new JWT();
        const ppt = jsonwebtoken.create({ uid: payload.sub, ...additional }, lifetime, signKey);
        return ppt;
    }

    /**
     * Restituisce la lista di tutte le sessioni, segnalando quella corrente
     * @param {string} currentGuid 
     * @param {string} userId 
     * @returns {Array<Object>}
     */
    async getAllSession(currentGuid, userId) {
        // -- calcolo il kid
        const currentKid = await this.shiv.calculateKid(currentGuid);
        // -- ottengo tutte le sessioni
        const sessions = await AuthKeys.findAll({
            where: { user_id: userId },
            attributes: {
                exclude: ['user_id', 'secret']
            }
        });
        // -- converto in json e verifico per ogni token se l'id corrisponde a quello corrente
        const sessionsJson = sessions.map(session => {
            const sessionJson = session.get();
            sessionJson.current = sessionJson.kid === currentKid;
            return sessionJson;
        });
        // ---
        return sessionsJson;
    }

    /**
     * Effettua l'update di una AuthKeys
     * @param {Object} conditions * condizioni per effettuare l'update WHERE id = ...
     * @param {*} newInfo * Oggetto che deve essere coerente con gli attributi di AuthKeys, che contiene le nuove informazioni
     * @param {boolean} [calculateKid=false]
     * @returns {Array} [affectedRows]
     */
    async update(conditions, newInfo, calculateKid = false) {
        if (calculateKid && conditions.kid) conditions.kid = await this.shiv.calculateKid(conditions.kid);
        // ---
        return await AuthKeys.update(
            newInfo,
            { where: conditions }
        );
    }

    /**
     * Effettua la cancellazione di una o più AuthKeys in base alle conditions
     * elimina anche da RedisDB
     * @param {Object} conditions * condizioni per WHERE id = ...
     * @param {boolean} [calculateKid=false]
     * @returns {number} numero di record eliminati
     */
    async delete(conditions, calculateKid = false) {
        if (calculateKid && conditions.kid) conditions.kid = await this.shiv.calculateKid(conditions.kid);
        // -- elimino da ram db anche
        await RedisDB.delete(conditions.kid);
        // ---
        return await AuthKeys.destroy(
            { where: conditions }
        );
    }

    /**
     * Elimina tutte le sessioni tranne la corrente
     * @param {Object} conditions 
     * @param {string} [conditions.kid] opzionale, se specificato verranno eliminate tutte le sessioni tranne quella corrente
     * @param {string} [conditions.user_id] obbligatorio, indica lo user id associato alla sessione
     * @returns {number} numero di record eliminati
     */
    async deleteAll(conditions) {
        if (!conditions.user_id) throw new Error('User ID è obbligatorio');
        // -- se presente il guid della sessione viene calcolato il kid
        let kidCondition = null;
        if (conditions.kid) {
            const pepedKid = await this.shiv.calculateKid(conditions.kid);
            kidCondition = { [Op.not]: pepedKid }
        }
        /**
         * Ottengo tutti i kid delle sessioni 
         * cosi mi assicuro di eliminarli anche su Redis
         */
        const kidModels = await AuthKeys.findAll({
            where: { user_id: conditions.user_id },
            attributes: { include: ['kid'] },
        });
        // -- Elimino su redis tutti i riferimenti
        for (const kidModel of kidModels) {
            RedisDB.delete(kidModel.kid);
        }
        /**
         * Elimino sul DB
         */
        // ---
        return await AuthKeys.destroy({
            where: {
                user_id: conditions.user_id,
                kid: kidCondition
            }
        });
    }
}
