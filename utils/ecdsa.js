import { generateKeyPair, createPublicKey, createPrivateKey, createSign, createVerify } from 'node:crypto';
import { promisify } from 'node:util';

/**
 * Class implementing ECDSA (Elliptic Curve Digital Signature Algorithm) for Node.js
 * with ES Modules and async operations where possible.
 */
export class ECDSA {
    /**
     * Supported elliptic curves for ECDSA.
     * @static
     * @readonly
     */
    static curves = {
        P256: 'prime256v1',  // Node.js uses different names for curves
        P384: 'secp384r1',
        P521: 'secp521r1'
    };

    /**
     * Async version of generateKeyPair
     * @private
     */
    #generateKeyPairAsync = promisify(generateKeyPair);

    /**
     * Generates an ECDSA key pair asynchronously.
     * 
     * @param {string} [curve=ECDSA.curves.P256] - The elliptic curve to use (default: P-256)
     * @returns {Promise<{publicKey: Buffer, privateKey: Buffer}>} The key pair as Buffers
     */
    async generateKeyPair(curve = ECDSA.curves.P256) {
        // Validate the curve
        if (!Object.values(ECDSA.curves).includes(curve)) {
            throw new Error(`Unsupported curve. Supported curves are: ${Object.values(ECDSA.curves).join(', ')}`);
        }

        const { publicKey, privateKey } = await this.#generateKeyPairAsync('ec', {
            namedCurve: curve,
            publicKeyEncoding: {
                type: 'spki',
                format: 'der'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'der'
            }
        });

        return { publicKey, privateKey };
    }

    /**
     * Imports a public key from DER/SPKI format.
     * 
     * @param {Buffer|Uint8Array} publicKeyBytes - The public key in DER/SPKI format
     * @param {string} [curve] - Not needed in Node.js as it's encoded in the key
     * @returns {Promise<KeyObject>} The imported public key as KeyObject
     */
    async importPublicKey(publicKeyBytes) {
        if (!Buffer.isBuffer(publicKeyBytes)) {
            publicKeyBytes = Buffer.from(publicKeyBytes);
        }
        return createPublicKey({
            key: publicKeyBytes,
            format: 'der',
            type: 'spki'
        });
    }

    /**
     * Signs a message using a private key asynchronously.
     * 
     * @param {Buffer|Uint8Array|string|KeyObject} privateKey - The private key
     * @param {Buffer|Uint8Array} message - The message to sign
     * @param {string} [hashAlgorithm="sha256"] - The hash algorithm to use
     * @returns {Promise<Buffer>} The signature
     */
    async sign(privateKey, message, hashAlgorithm = 'sha256') {
        if (!Buffer.isBuffer(message)) {
            message = Buffer.from(message);
        }

        let keyObject;
        if (Buffer.isBuffer(privateKey) || privateKey instanceof Uint8Array) {
            keyObject = createPrivateKey({
                key: privateKey,
                format: 'der',
                type: 'pkcs8'
            });
        } else if (typeof privateKey === 'string') {
            keyObject = createPrivateKey(privateKey);
        } else {
            keyObject = privateKey;
        }

        return new Promise((resolve) => {
            const sign = createSign(hashAlgorithm);
            sign.update(message);
            resolve(sign.sign(keyObject));
        });
    }

    /**
     * Verifies a signature against a message using a public key asynchronously.
     * 
     * @param {Buffer|Uint8Array|string|KeyObject} publicKey - The public key
     * @param {Buffer|Uint8Array} signature - The signature to verify
     * @param {Buffer|Uint8Array} message - The original message
     * @param {string} [hashAlgorithm="sha256"] - The hash algorithm used
     * @returns {Promise<boolean>} True if the signature is valid
     */
    async verify(publicKey, signature, message, hashAlgorithm = 'sha256') {
        if (!Buffer.isBuffer(message)) {
            message = Buffer.from(message);
        }
        if (!Buffer.isBuffer(signature)) {
            signature = Buffer.from(signature);
        }

        let keyObject;
        if (Buffer.isBuffer(publicKey) || publicKey instanceof Uint8Array) {
            keyObject = createPublicKey({
                key: publicKey,
                format: 'der',
                type: 'spki'
            });
        } else if (typeof publicKey === 'string') {
            keyObject = createPublicKey(publicKey);
        } else {
            keyObject = publicKey;
        }

        return new Promise((resolve) => {
            const verify = createVerify(hashAlgorithm);
            verify.update(message);
            resolve(verify.verify(keyObject, signature));
        });
    }

    /**
     * Exports a private key in PKCS#8 format asynchronously.
     * 
     * @param {KeyObject|Buffer|string} privateKey - The private key to export
     * @returns {Promise<Buffer>} The exported private key
     */
    async exportPrivateKey(privateKey) {
        if (Buffer.isBuffer(privateKey) || privateKey instanceof Uint8Array) {
            return Buffer.from(privateKey); // Already in DER format
        }

        let keyObject;
        if (typeof privateKey === 'string') {
            keyObject = createPrivateKey(privateKey);
        } else {
            keyObject = privateKey;
        }

        return keyObject.export({
            format: 'der',
            type: 'pkcs8'
        });
    }

    /**
     * Imports a private key from PKCS#8 format asynchronously.
     * 
     * @param {Buffer|Uint8Array} privateKeyBytes - The private key in DER/PKCS#8 format
     * @returns {Promise<KeyObject>} The imported private key
     */
    async importPrivateKey(privateKeyBytes) {
        if (!Buffer.isBuffer(privateKeyBytes)) {
            privateKeyBytes = Buffer.from(privateKeyBytes);
        }
        return createPrivateKey({
            key: privateKeyBytes,
            format: 'der',
            type: 'pkcs8'
        });
    }
}