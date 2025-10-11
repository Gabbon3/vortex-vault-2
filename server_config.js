import 'dotenv/config';
import crypto from "crypto";
import { Bytes } from './utils/bytes.js';

export class Config {
    static initialized = false;
    // 
    static PORT = process.env.PORT || 8080;
    // Database
    static DB_HOST = process.env.DB_HOST;
    static DB_NAME = process.env.DB_NAME;
    static DB_USER = process.env.DB_USER;
    static DB_PASSWORD = process.env.DB_PASSWORD;
    // Mail
    static FISH_KEY = null;
    static FISH_SALT = Bytes.hex.decode(process.env.FISH_SALT);
    static EMAIL_USER = process.env.EMAIL_USER;
    static EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
    // PASSKEYS
    static ORIGIN = process.env.ORIGIN;
    static RPID = process.env.RPID;
    // AUTH
    static JWT_SIGN_KEY = null;
    static AUTH_TOKEN_EXPIRY = 15 * 60; // 15 minuti
    static AUTH_TOKEN_COOKIE_EXPIRY = 24 * 60 * 60 * 1000;
    static AUTH_ADVANCED_TOKEN_EXPIRY = 7 * 60; // 7 minuti
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
    // Dev
    static DEV = process.env.DEV === 'true';
    // Numero di tentativi massimi per rate limiter -> email
    static TRLEMAIL = 5; // TRL = Tentativi Rate Limiter per Email

    /**
     * Inizializza le variabili
     */
    static async initialize() {
        if (this.initialized) return;
        // ---
        this.JWT_SIGN_KEY = await crypto.subtle.importKey(
            "raw",
            Buffer.from(process.env.ACCESS_TOKEN_SECRET, 'hex'),
            {
                name: "HMAC",
                hash: "SHA-256",
            },
            false,
            ["sign", "verify"]
        );
        // ---
        this.FISH_KEY = await crypto.subtle.importKey(
            "raw",
            Buffer.from(process.env.FISH_SECRET, 'hex'),
            {
                name: "HMAC",
                hash: "SHA-256",
            },
            false,
            ["sign", "verify"]
        );
        // ---
        this.initialized = true;
    }
}