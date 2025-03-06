import express from 'express';
import cookieParser from 'cookie-parser';
import { Config } from './server_config.js';
import { sequelize } from './config/db.js';
import user_routes from './routes/user.routes.js';
import token_routes from './routes/token.routes.js';
import vault_routes from './routes/vault.routes.js';
import cke_routes from './routes/lsk.routes.js';
import backup_routes from './routes/backup.routes.js';
import static_routes from './routes/static.routes.js';
import secure_link_routes from './routes/secure-link.routes.js';
import passkey_routes from './routes/passkey.routes.js';
import lse_routes from './routes/lse.routes.js';
import './models/associations.js';
import { csp_middleware, security_headers } from './config/csp.js';
import { error_handler_middleware } from './middlewares/errorMiddleware.js';
// import { UID } from './utils/uid.js';
// import { Mailer } from './config/mail.js';
import https from 'https';
import fs from 'fs';
import { date } from './utils/dateUtils.js';
/**
 * MIDDLEWARES
 * qui ci sono i middleware che verranno utilizzati in tutte le routes
 */
const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());
app.use(csp_middleware);
app.use(security_headers);

/**
 * ROUTES
 */
app.use('/auth', user_routes);
app.use('/auth/cke', cke_routes);
app.use('/auth/lse', lse_routes);
app.use('/auth/token', token_routes);
app.use('/auth/passkey', passkey_routes);
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

const PORT = Config.DB_PORT || 3000;

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
//     https.createServer(options, app).listen(PORT, () => {
//         console.log(`☑️ Server`);
//         console.log(`☑️ ${date.format('%H:%i:%s')}`);
//     });
// } catch (error) {
//     console.error('❌ Errore durante l\'avvio del server => ', error);
// }
/**
 * _____
 */

try {
    await sequelize.authenticate();
    console.log('☑️ DB');
    // -- da utilizzare solo quando ci si vuole allineare con il db
    // await sequelize.sync({ force: true });
    // console.log('☑️ Struct');
    // ---
    app.listen(PORT, () => {
        console.log(`☑️ Server`);
        console.log(`☑️ ${date.format('%H:%i:%s')}`);
    });
} catch (error) {
    console.error('❌ Errore durante l\'avvio del server => ', error);
}

/**
 * AVVIO SERVER CHAT
 */
import './chat/websocket/websocket.server.js';