import 'dotenv/config';

export class Config {
    // JWT
    static ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
    static TOKEN_KEY = Buffer.from(process.env.TOKEN_KEY, 'hex'); // usata per gli access token cifrati
    static PASSKEY_TOKEN_SECRET = Buffer.from(process.env.PASSKEY_TOKEN_SECRET, 'hex');
    // Database
    static DB_HOST = process.env.DB_HOST;
    static DB_PORT = process.env.PORT;
    static DB_NAME = process.env.DB_NAME;
    static DB_USER = process.env.DB_USER;
    static DB_PASSWORD = process.env.DB_PASSWORD;
    // Mail
    static FISH_KEY = Buffer.from(process.env.FISH_SECRET, "hex");
    static EMAIL_USER = process.env.EMAIL_USER;
    static EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
    // PASSKEYS
    static ORIGIN = process.env.ORIGIN;
    static RPID = process.env.RPID;
    // TOTP
    static MFA_KEYS = Buffer.from(process.env.MFA_KEYS, 'hex');
    // Percorso Rocks DB
    static ROCKSDB_MSG_PATH = process.env.ROCKSDB_MSG_PATH;
    // Percorso cartella dei log
    static LOG_PATH = process.env.LOG_PATH;
    // Origin
    static WSORIGIN = process.env.WSORIGIN;
    static HTTPROTOCOL = process.env.HTTPROTOCOL;
}