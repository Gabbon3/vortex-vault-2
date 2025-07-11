import { createPrivateKey, createPublicKey } from 'crypto';
import 'dotenv/config';

export class Config {
    // 
    static PORT = process.env.PORT || 8080;
    // Database
    static DB_HOST = process.env.DB_HOST;
    static DB_NAME = process.env.DB_NAME;
    static DB_USER = process.env.DB_USER;
    static DB_PASSWORD = process.env.DB_PASSWORD;
    // Mail
    static FISH_KEY = Buffer.from(process.env.FISH_SECRET, "hex");
    static FISH_SALT = Buffer.from(process.env.FISH_SALT, "hex");
    static EMAIL_USER = process.env.EMAIL_USER;
    static EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
    // PASSKEYS
    static ORIGIN = process.env.ORIGIN;
    static RPID = process.env.RPID;
    // Percorso Rocks DB
    static ROCKSDB_MSG_PATH = process.env.ROCKSDB_MSG_PATH;
    // Percorso cartella dei log
    static LOG_PATH = process.env.LOG_PATH;
    // Origin
    static WSORIGIN = process.env.WSORIGIN;
    static HTTPROTOCOL = process.env.HTTPROTOCOL;
    // REDIS
    static REDIS_HOST = process.env.REDIS_HOST;
    static REDIS_PORT = process.env.REDIS_PORT;
    static REDIS_URL = process.env.REDIS_URL;
    // SHIV
    static SHIVPEPPER = Buffer.from(process.env.SHIVPEPPER, "hex");
    // Dev
    static DEV = process.env.DEV === 'true';
    // Numero di tentativi massimi per rate limiter -> email
    static TRLEMAIL = 5; // TRL = Tentativi Rate Limiter per Email
    // DPoP
    static DPOP_PRIVATE_KEY = createPrivateKey({
        key: process.env.DPOP_PRIVATE_KEY.replace(/\\n/g, '\n'),
        format: 'pem'
    });
    static DPOP_PUBLIC_KEY = createPublicKey({
        key: process.env.DPOP_PUBLIC_KEY.replace(/\\n/g, '\n'),
        format: 'pem'
    });
}