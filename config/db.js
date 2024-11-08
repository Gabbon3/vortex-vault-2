import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

export const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false,
        pool: {
            max: 5,           // Numero massimo di connessioni attive
            min: 0,           // Numero minimo di connessioni
            acquire: 30000,   // Tempo massimo (in ms) per tentare di acquisire una connessione
            idle: 10000       // Tempo massimo (in ms) che una connessione può rimanere inattiva prima di essere rilasciata
        }
    }
);