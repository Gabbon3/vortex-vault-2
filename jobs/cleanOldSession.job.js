import { sequelize } from "../config/db.js";

// -- soglia di inattività in giorni
const INACTIVITY_THRESHOLD_DAYS = 30;
// -- massimo numero di sessioni eliminate per batch
const MAX_SESSIONS_TO_DELETE = 1000;

const QUERY = `
  WITH old_sessions AS (
    SELECT kid
    FROM auth_keys
    WHERE last_seen_at IS NOT NULL
      AND last_seen_at < NOW() - INTERVAL '${INACTIVITY_THRESHOLD_DAYS} days'
    LIMIT ${MAX_SESSIONS_TO_DELETE}
  )
  DELETE FROM auth_keys
  WHERE kid IN (SELECT kid FROM old_sessions);
`;

/**
 * Rimuove le sessioni inattive da oltre 30 giorni.
 * Esegue una DELETE batch-safe tramite CTE.
 */
// TODO: fare il batch di 1000 alla volta
export async function cleanOldSessions() {
    console.log("[CronJob] Delete Sessions...");
    try {
        const [results, metadata] = await sequelize.query(QUERY);
        console.log(`[cleanOldSessions] Pulizia completata. Batch eliminato: max ${MAX_SESSIONS_TO_DELETE}`);
    } catch (error) {
        console.error("[cleanOldSessions] Errore durante la pulizia delle sessioni:", error);
    }
}