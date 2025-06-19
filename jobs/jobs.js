import cron from 'node-cron';
// ---
import { cleanDeletedVaults } from './cleanDeletedVaults.job.js';
import { cleanOldSessions } from './cleanOldSession.job.js';

// ogni giorno alle 3:00
cron.schedule('0 3 * * *', cleanDeletedVaults);
// ogni giorno alle 03:30
cron.schedule("30 3 * * *", cleanOldSessions);
// ---
console.log('☑️ Jobs');