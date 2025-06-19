import { sequelize } from '../config/db.js';

/**
 * Elimino 1000 record alla volta sfruttando una CTE (Common Table Expression)
 */
const DELETE_QUERY = `
  WITH to_delete AS (
    SELECT id FROM vault
    WHERE deleted = true
      AND updated_at < NOW() - INTERVAL '31 days'
    LIMIT 1000
  )
  DELETE FROM vault
  USING to_delete
  WHERE vault.id = to_delete.id
  RETURNING vault.id;
`;

/**
 * Metodo che pulisce i vault eliminati da un po' di tempo
 */
export const cleanDeletedVaults = async () => { // ogni giorno alle 3:00
    console.log('[CronJob] Delete Vaults...');
    try {
        let totalDeleted = 0;
        let round = 0;
        // -- itero finche ci sono record da eliminare
        while (true) {
            const [results] = await sequelize.query(DELETE_QUERY);
            const deletedCount = results.length;

            if (deletedCount === 0) break;

            totalDeleted += deletedCount;
            round++;

            console.log(`[VaultCleanup] Round ${round} - Eliminati ${deletedCount} record`);
            // Attendi qualche secondo per non saturare il db
            await new Promise(r => setTimeout(r, 5000));
        }

        if (totalDeleted > 0) {
            console.log(`[VaultCleanup] Completato. Totale eliminati: ${totalDeleted}`);
        } else {
            // console.log('[VaultCleanup] Nessun record da eliminare.');
        }

    } catch (err) {
        console.error('[VaultCleanup] Errore durante l\'eliminazione:', err);
    }
};