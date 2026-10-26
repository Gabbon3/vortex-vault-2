import { Sequelize } from 'sequelize';
import { Config } from '../server_config.js';

export const sequelize = new Sequelize(
    Config.DB_NAME,
    Config.DB_USER,
    Config.DB_PASSWORD,
    {
        host: Config.DB_HOST,
        port: Config.DB_PORT || 6543,
        dialect: 'postgres',
        dialectOptions: Config.DEV ? {} : {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        noPgPrepare: true, 
        logging: false,
        timezone: '+00:00',
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);