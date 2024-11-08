import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { sequelize } from './config/db.js';
import user_routes from './routes/userRoutes.js';
import token_routes from './routes/tokenRoutes.js';
import vault_routes from './routes/vaultRoutes.js';
import cke_routes from './routes/ckeRoutes.js';
import './models/associations.js';
import { error_handler_middleware } from './middlewares/errorMiddleware.js';

dotenv.config();

/**
 * MIDDLEWARES
 * qui ci sono i middleware che verranno utilizzati in tutte le routes
 */
const app = express();
app.use(express.json());
app.use(cookieParser());

/**
 * ROUTES
 */
app.use('/auth', user_routes);
app.use('/auth/cke', cke_routes);
app.use('/auth/token', token_routes);
app.use('/vault', vault_routes);

/**
 * Middlewares per gli errori
 */
app.use(error_handler_middleware);

const PORT = process.env.PORT || 3000;

try {
    await sequelize.authenticate();
    console.log('☑️ DB');
    // -- da utilizzare solo quando ci si vuole allineare con il db
    // await sequelize.sync({ force: false });
    // console.log('Modelli sincronizzati con il database.');
    // ---
    app.listen(PORT, () => {
        console.log(`☑️ Server => http://localhost:${PORT}`);
    });
} catch (error) {
    console.error('❌ Errore durante l\'avvio del server => ', error);
}