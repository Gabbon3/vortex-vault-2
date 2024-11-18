import { Backup } from "../models/backup.js";

export class BackupService {
    /**
     * Crea un nuovo backup per un utente
     * @param {Uint8Array} backup 
     * @param {number} user_id 
     */
    async create(backup_bytes, user_id) {
        const backup = await Backup.create({
            user_id,
            bin: backup_bytes
        });
        // ---
        return backup;
    }
    /**
     * Restituisce un singolo backup tramite il suo id
     * @param {string} backup_id 
     * @param {number} user_id 
     * @returns 
     */
    async get_id(backup_id, user_id) {
        return await Backup.findOne({
            where: {
                id: backup_id,
                user_id
            }
        })
    }
    /**
     * Restituisce tutti i backup
     * @param {number} user_id
     * @returns {Array<Backup>}
     */
    async get(user_id) {
        return await Backup.findAll({ where: { user_id } });
    }
    /**
     * Elimina un backup dal db
     * @param {string} backup_id 
     * @param {number} user_id 
     * @returns 
     */
    async delete(backup_id, user_id) {
        return await Backup.destroy({
            where: {
                id: backup_id,
                user_id
            }
        })
    }
}