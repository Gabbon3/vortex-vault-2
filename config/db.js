import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const ssl_cert_path = path.resolve('./config/ssl.crt');

export const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false,
                ca: fs.readFileSync(ssl_cert_path).toString(),
            }
        },
        logging: false,
        pool: {
            max: 5,           // Numero massimo di connessioni attive
            min: 0,           // Numero minimo di connessioni
            acquire: 30000,   // Tempo massimo (in ms) per tentare di acquisire una connessione
            idle: 10000       // Tempo massimo (in ms) che una connessione può rimanere inattiva prima di essere rilasciata
        }
    }
);