import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import jwt from 'jsonwebtoken';
import { ECDSA } from '../utils/ecdsa.js';
import { Config } from '../server_config.js';

/**
 * Implementazione server DPoP con ECDSA
 * Utilizza la classe ECDSA fornita per tutte le operazioni crittografiche
 */
export class DPoP {
    static jwtLifetime = 14 * 24 * 60 * 60; // in secondi
    /**
     * @param {Object} options - Configurazione DPoP
     * @param {string} options.issuer - Issuer del server
     * @param {string|Buffer} options.privateKey - Chiave privata ECDSA (PEM o Buffer)
     * @param {string|Buffer} options.publicKey - Chiave pubblica ECDSA (PEM o Buffer)
     * @param {string} [options.curve] - Curva ellittica (default: 'P-256')
     * @param {Object} options.keyStorage - Adapter per lo storage delle chiavi
     * @param {number} [options.maxClockSkew=30] - Skew temporale massimo in secondi
     */
    constructor(options = {}) {
        this.issuer = options.issuer || 'urn:example:issuer';
        this.curve = options.curve || 'P-256';
        this.maxClockSkew = options.maxClockSkew || 30;
        this.keyStorage = options.keyStorage;

        // Inizializza ECDSA helper
        this.ecdsa = new ECDSA();

        // Carica la chiave privata
        this.privateKey = options.privateKey || Config.DPOP_PRIVATE_KEY;
        this.publicKey = options.publicKey || Config.DPOP_PUBLIC_KEY;

        // Configura algoritmi
        this.jwtAlg = this._getJwtAlgorithmForCurve(this.curve);
        this.jwtSign = promisify(jwt.sign);
        this.jwtVerify = promisify(jwt.verify);
    }

    /**
     * Verifica un token DPoP
     * @param {string} token - Token DPoP in formato JWT
     * @param {string} httpMethod - Metodo HTTP della richiesta
     * @param {string} httpUrl - URL della richiesta
     * @returns {Promise<DPoPVerificationResult>}
     */
    async verify(token, httpMethod, httpUrl) {
        try {
            // 1. Decodifica base del token
            const [header, payload, signature] = token.split('.');
            if (!header || !payload || !signature) {
                return { isValid: false, error: 'invalid_token_format' };
            }

            // 2. Decodifica header e payload
            const decodedHeader = this._base64UrlDecode(header);
            const decodedPayload = this._base64UrlDecode(payload);

            // 3. Verifica struttura base
            if (decodedHeader.typ !== 'dpop+jwt') {
                return { isValid: false, error: 'invalid_token_type' };
            }

            if (!decodedHeader.jwk || !decodedHeader.alg) {
                return { isValid: false, error: 'missing_required_fields' };
            }

            // 4. Verifica claims
            const now = Math.floor(Date.now() / 1000);
            const validation = this._validateClaims(decodedPayload, httpMethod, httpUrl, now);
            if (!validation.isValid) {
                return validation;
            }

            // 5. Importa chiave pubblica da JWK
            const publicKey = await this.ecdsa.importPublicKeyFromJWK(decodedHeader.jwk);

            // 6. Verifica firma
            const signingInput = `${header}.${payload}`;
            const rawSig = this._base64UrlDecode(signature, true);
            const sigBytes = this.ecdsa.rawToDer(Buffer.from(rawSig));

            const isValid = await this.ecdsa.verify(
                publicKey,
                sigBytes,
                new TextEncoder().encode(signingInput),
                'sha256'
            );

            if (!isValid) {
                return { isValid: false, error: 'invalid_signature' };
            }

            // 7. Calcola thumbprint della chiave
            const thumbprint = this.computeJwkThumbprint(decodedHeader.jwk);

            return {
                isValid: true,
                payload: decodedPayload,
                jwk: decodedHeader.jwk,
                thumbprint,
                header: decodedHeader
            };
        } catch (error) {
            return { isValid: false, error: error.message };
        }
    }

    /**
     * Crea un access token con binding alla chiave DPoP
     * @param {Object} payload - Payload del token
     * @param {string} dpopThumbprint - Thumbprint della chiave DPoP (RFC 7638)
     * @param {Object} [options] - Opzioni aggiuntive
     * @returns {Promise<string>} Access token firmato
     */
    async createAccessToken(payload, dpopThumbprint, options = {}) {
        const tokenPayload = {
            ...payload,
            cnf: { jkt: dpopThumbprint } // Key binding (RFC 7800)
        };

        return this.jwtSign(tokenPayload, this.privateKey, {
            issuer: this.issuer,
            algorithm: this.jwtAlg,
            expiresIn: '14d',
            ...options
        });
    }

    /**
     * Verifica l'access token e il binding con DPoP
     * @param {string} accessToken - Access token JWT
     * @param {string} dpopThumbprint - Thumbprint atteso
     * @returns {Promise<Object>} Payload del token verificato
     */
    async verifyAccessToken(accessToken, dpopThumbprint) {
        const payload = await this.jwtVerify(accessToken, this.publicKey, {
            issuer: this.issuer,
            algorithms: [this.jwtAlg]
        });

        if (payload.cnf?.jkt !== dpopThumbprint) {
            throw new Error('token_key_binding_mismatch');
        }

        return payload;
    }

    /**
     * Calcola l'hash della chiave pubblica
     * @param {Object} jwk 
     * @returns {string} base64 dell hash della chiave pubblica jwk
     */
    async computeJwkThumbprint(jwk) {
        // RFC 7638 - JSON senza spazi e con ordine alfabetico
        const sorted = {
            crv: jwk.crv,
            kty: jwk.kty,
            x: jwk.x,
            y: jwk.y
        };
        // ---
        const json = JSON.stringify(sorted);
        return createHash('sha256')
            .update(json)
            .digest('base64url');
    }

    // === Metodi privati ===

    _getJwtAlgorithmForCurve(curve) {
        const mapping = {
            'P-256': 'ES256',
            'P-384': 'ES384',
            'P-521': 'ES512'
        };

        if (!mapping[curve]) {
            throw new Error(`Unsupported curve: ${curve}`);
        }

        return mapping[curve];
    }

    _validateClaims(payload, httpMethod, httpUrl, currentTime) {
        // Verifica HTTP method
        if (payload.htm !== httpMethod.toUpperCase()) {
            return { isValid: false, error: 'http_method_mismatch' };
        }

        // Verifica HTTP URL
        if (payload.htu !== this._normalizeUrl(httpUrl)) {
            return { isValid: false, error: 'http_uri_mismatch' };
        }

        // Verifica timestamp
        // if (payload.iat && Math.abs(payload.iat - currentTime) > this.maxClockSkew) {
        //     return { isValid: false, error: 'invalid_timestamp' };
        // }

        // Verifica scadenza
        if (payload.exp && payload.exp < currentTime) {
            return { isValid: false, error: 'token_expired' };
        }

        return { isValid: true };
    }

    _normalizeUrl(url) {
        try {
            const u = new URL(url);
            u.hash = '';
            u.search = ''; // Rimuove interamente i search params
            return u.toString();
        } catch (error) {
            throw new Error(`Invalid URL: ${url}`);
        }
    }

    _base64UrlDecode(input, asBuffer = false) {
        // Padding per lunghezza non multipla di 4
        let padded = input;
        while (padded.length % 4 !== 0) {
            padded += '=';
        }

        const buffer = Buffer.from(padded
            .replace(/-/g, '+')
            .replace(/_/g, '/'), 'base64');

        return asBuffer ? buffer : JSON.parse(buffer.toString());
    }
}