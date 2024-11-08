import { Op } from "sequelize";
import { Vault } from "../models/vault.js";
import { UID } from "../utils/uid.js";

export class VaultService {
    static id_random_length = 5;
    /**
     * Crea un nuovo vault sul db
     * @param {number} user_id 
     * @param {Uint8Array} secrets 
     * @returns {Vault}
     */
    async create(user_id, secrets) {
        const vault_id = UID.generate(VaultService.id_random_length, true);
        // ---
        const vault = await Vault.create({
            id: vault_id,
            user_id,
            secrets
        });
        // ---
        return vault ? vault : null;
    }
    /**
     * Restituisce un singolo vault tramite il suo id
     * @param {number} user_id 
     * @param {string} vault_id 
     * @returns 
     */
    async get_id(user_id, vault_id) {
        return await Vault.findOne({
            where: {
                id: vault_id,
                user_id
            }
        })
    }
    /**
     * Restituisce tutti o alcuni vault in base alla data di ultima modifica
     * @param {number} user_id 
     * @param {Date} updated_after 
     * @returns {Array<Vault>}
     */
    async get(user_id, updated_after = null) {
        return await Vault.findAll({
            where: {
                user_id,
                updated_at: {
                    [Op.gt]: updated_after ?? new Date(0)
                }
            }
        });
    }
    /**
     * Aggiorna un vault modificando le informazioni cifrate
     * @param {number} user_id 
     * @param {string} vault_id 
     * @param {Uint8Array} secrets 
     * @returns 
     */
    async update(user_id, vault_id, secrets) {
        const [updated_rows] = await Vault.update(
            { secrets },
            { where: {
                id: vault_id,
                user_id
            } }
        );
        // -- se nessuna riga è stata aggiornata restituisco null
        if (updated_rows === 0) return null;
        // -- restituisco il vault aggiornato
        return await this.get_id(user_id, vault_id);
    }
    /**
     * Elimina un vault dal db
     * @param {number} user_id 
     * @param {string} vault_id 
     * @returns 
     */
    async delete(user_id, vault_id) {
        return await Vault.destroy({
            where: {
                id: vault_id,
                user_id
            }
        })
    }
}