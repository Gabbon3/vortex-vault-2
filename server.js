import express from 'express';
import cookieParser from 'cookie-parser';
import { sequelize } from './config/db.js';
import user_routes from './routes/user.routes.js';
import vault_routes from './routes/vault.routes.js';
import backup_routes from './routes/backup.routes.js';
import static_routes from './routes/static.routes.js';
import secure_link_routes from './routes/secure-link.routes.js';
import passkey_routes from './routes/passkey.routes.js';
import public_key_routes from './routes/publicKey.routes.js';
import cke_routes from './routes/cke.routes.js';
import './models/associations.js';
import { cors_middleware, csp_middleware, security_headers } from './config/csp.js';
import { error_handler_middleware } from './middlewares/errorMiddleware.js';
// import { UID } from './utils/uid.js';
// import { Mailer } from './config/mail.js';
import https from 'https';
import fs from 'fs';
import { date } from './utils/dateUtils.js';
import { Config } from './server_config.js';
Config.initialize();
// -- Chron e Jobs
import './jobs/jobs.js';

/**
 * Globals
 */
// import { webcrypto } from 'node:crypto';
// globalThis.crypto = webcrypto;

/**
 * MIDDLEWARES
 * qui ci sono i middleware che verranno utilizzati in tutte le routes
 */
const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());
// ---
app.use(cors_middleware);
/**
 * gestiti da cloudfare
 */
if (Config.DEV) {
    app.use(csp_middleware);
    app.use(security_headers);
}
// --- memorizza nella request se è stata l'estensione o la web app a fare la richiesta
app.use((req, res, next) => {
    req.isExtension = req.headers["x-client-type"] === "extension";
    next();
});

/**
 * ROUTES
 */
app.use('/auth', user_routes);
app.use('/cke', cke_routes);
app.use('/auth/passkey', passkey_routes);
app.use('/public-key', public_key_routes);
app.use('/vaults', vault_routes);
app.use('/backup', backup_routes);
app.use('/secure-link', secure_link_routes);
/**
 * Pubbliche
 */
app.use('/', static_routes);

/**
 * Middlewares per gli errori
 */
app.use(error_handler_middleware);

/**
 * HTTPS
 */
// const options = {
//     key: fs.readFileSync('./localhost-key.pem'),
//     cert: fs.readFileSync('./localhost.pem'),
// };
// try {
//     await sequelize.authenticate();
//     console.log('☑️ DB');
//     https.createServer(options, app).listen(3000, () => {
//         console.log(`☑️ Server`);
//         console.log(`☑️ ${date.format('%H:%i:%s')}`);
//     });
// } catch (error) {
//     console.error('❌ Errore durante l\'avvio del server => ', error);
// }
/**
 * _____
 */

/**
 * HTTP
 */
try {
    await sequelize.authenticate();
    console.log('☑️ DB');
    // -- da utilizzare solo quando ci si vuole allineare con il db
    // await sequelize.sync({ force: true });
    // console.log('☑️ Struct');
    // ---
    app.listen(Config.PORT, '0.0.0.0', () => {
        console.log(`☑️ Server`);
        console.log(`☑️ ${date.format('%d %M %Y %H:%i:%s')}`);
    });
} catch (error) {
    console.error('❌ Errore durante l\'avvio del server => ' + error);
}
/**
 * AVVIO SERVER CHAT
 */
// import './chat/websocket/websocket.server.js';