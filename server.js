import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { sequelize } from './config/db.js';
import user_routes from './routes/user.routes.js';
import token_routes from './routes/token.routes.js';
import vault_routes from './routes/vault.routes.js';
import cke_routes from './routes/cke.routes.js';
import backup_routes from './routes/backup.routes.js';
import static_routes from './routes/static.routes.js';
import './models/associations.js';
import { error_handler_middleware } from './middlewares/errorMiddleware.js';
// import { Mailer } from './config/mail.js';

dotenv.config();

/**
 * MIDDLEWARES
 * qui ci sono i middleware che verranno utilizzati in tutte le routes
 */
const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());

/**
 * ROUTES
 */
app.use('/auth', user_routes);
app.use('/auth/cke', cke_routes);
app.use('/auth/token', token_routes);
app.use('/vaults', vault_routes);
app.use('/backup', backup_routes);
/**
 * Pubbliche
 */
app.use('/', static_routes);

/**
 * Middlewares per gli errori
 */
app.use(error_handler_middleware);

const PORT = process.env.PORT || 3000;

try {
    await sequelize.authenticate();
    console.log('☑️ DB');
    // -- da utilizzare solo quando ci si vuole allineare con il db
    // await sequelize.sync({ force: true });
    // console.log('☑️ Struct');
    // ---
    app.listen(PORT, () => {
        console.log(`☑️ Server`);
    });
} catch (error) {
    console.error('❌ Errore durante l\'avvio del server => ', error);
}