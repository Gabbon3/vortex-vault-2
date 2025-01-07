import { Op } from "sequelize";
import { Vault } from "../models/vault.js";
import { sequelize } from "../config/db.js";

export class VaultService {
    static id_random_length = 8;
    /**
     * Crea un nuovo vault sul db
     * @param {number} user_id 
     * @param {Uint8Array} secrets 
     * @returns {Vault}
     */
    async create(user_id, secrets) {
        const vault = await Vault.create({
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
        const where = { user_id };
        if (updated_after) {
            where.updated_at = {
                [Op.gt]: updated_after.toISOString()
            }
        }
        // ---
        return await Vault.findAll({ where });
    }
    /**
     * Conta il numero di vaults totali
     * @param {string} user_id 
     * @returns {Array<Vault>}
     */
    async count(user_id) {
        return await Vault.count({
            where: { user_id }
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
     * Esegue il restore completo dei vault.
     * 1. Rimuove i vecchi vault per l'utente.
     * 2. Aggiunge i nuovi vault.
     * 
     * @param {number} user_id - ID dell'utente
     * @param {Array} vaults - Array di oggetti vault con i segreti
     * @returns {Array} - Array degli ID dei vault creati
     */
    async restore(user_id, vaults) {
        // -- avvio una transazione
        const t = await sequelize.transaction();
        // ---
        try {
            // -- elimino i vecchi vault
            await Vault.destroy({
                where: { user_id },
                transaction: t
            });
            // -- inserisco i nuovi vault
            for (const vault of vaults) {
                const { secrets, createdAt, updatedAt } = vault;
                // ---
                const secrets_buffer = Buffer.from(secrets);
                // ---
                await Vault.create({
                    user_id,
                    secrets: secrets_buffer,
                    createdAt,
                    updatedAt
                }, { 
                    transaction: t,
                    silent: true
                });
            }
            // -- committo la transazione
            await t.commit();
            return true;
        } catch (error) {
            await t.rollback();
            console.warn(error);
            return false;
        }
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