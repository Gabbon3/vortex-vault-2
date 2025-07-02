/**
 * Class implementing ECDSA (Elliptic Curve Digital Signature Algorithm) using Web Crypto API.
 */
export class ECDSA {
    /**
     * Supported elliptic curves for ECDSA.
     * @static
     * @readonly
     */
    static curves = {
        P256: "P-256",
        P384: "P-384",
        P521: "P-521"
    };

    /**
     * Generates an ECDSA key pair.
     * 
     * @param {string} [curve=ECDSA.curves.P256] - The elliptic curve to use (default: P-256)
     * @param {boolean} [exportable=false] - Whether the keys should be exportable (default: false)
     * @returns {Promise<{publicKey: Uint8Array, privateKey: CryptoKey}>} The public key as Uint8Array and private key as CryptoKey
     */
    async generateKeyPair(curve = ECDSA.curves.P256, exportable = false) {
        // Validate the curve
        if (!Object.values(ECDSA.curves).includes(curve)) {
            throw new Error(`Unsupported curve. Supported curves are: ${Object.values(ECDSA.curves).join(', ')}`);
        }

        // Generate the ECDSA key pair
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "ECDSA",
                namedCurve: curve,
            },
            exportable, // Keys are not exportable by default
            ["sign", "verify"]
        );

        // Export the public key in SPKI format
        const exportedPublicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);

        return {
            publicKey: new Uint8Array(exportedPublicKey),
            privateKey: keyPair.privateKey,
        };
    }

    /**
     * Imports a public key from SPKI format.
     * 
     * @param {Uint8Array} publicKeyBytes - The public key in Uint8Array format
     * @param {string} [curve=ECDSA.curves.P256] - The elliptic curve used (default: P-256)
     * @param {boolean} [exportable=false] - Whether the key should be exportable (default: false)
     * @returns {Promise<CryptoKey>} The imported public key as CryptoKey
     */
    async importPublicKey(publicKeyBytes, curve = ECDSA.curves.P256, exportable = false) {
        return window.crypto.subtle.importKey(
            "spki",
            publicKeyBytes,
            {
                name: "ECDSA",
                namedCurve: curve,
            },
            exportable,
            ["verify"]
        );
    }

    /**
     * Signs a message using a private key.
     * 
     * @param {CryptoKey} privateKey - The private key as CryptoKey
     * @param {Uint8Array} message - The message to sign as Uint8Array
     * @param {string} [hashAlgorithm="SHA-256"] - The hash algorithm to use (default: SHA-256)
     * @returns {Promise<Uint8Array>} The signature as Uint8Array
     */
    async sign(privateKey, message, hashAlgorithm = "SHA-256") {
        const signature = await window.crypto.subtle.sign(
            {
                name: "ECDSA",
                hash: { name: hashAlgorithm },
            },
            privateKey,
            message
        );

        return new Uint8Array(signature);
    }

    /**
     * Verifies a signature against a message using a public key.
     * 
     * @param {CryptoKey} publicKey - The public key as CryptoKey
     * @param {Uint8Array} signature - The signature to verify as Uint8Array
     * @param {Uint8Array} message - The original message as Uint8Array
     * @param {string} [hashAlgorithm="SHA-256"] - The hash algorithm used (default: SHA-256)
     * @returns {Promise<boolean>} True if the signature is valid, false otherwise
     */
    async verify(publicKey, signature, message, hashAlgorithm = "SHA-256") {
        return window.crypto.subtle.verify(
            {
                name: "ECDSA",
                hash: { name: hashAlgorithm },
            },
            publicKey,
            signature,
            message
        );
    }

    /**
     * Exports a private key in PKCS#8 format (only if key was created as exportable).
     * 
     * @param {CryptoKey} privateKey - The private key to export
     * @returns {Promise<Uint8Array>} The exported private key as Uint8Array
     * @throws {Error} If the key is not exportable
     */
    async exportPrivateKey(privateKey) {
        const exportedPrivateKey = await window.crypto.subtle.exportKey("pkcs8", privateKey);
        return new Uint8Array(exportedPrivateKey);
    }

    /**
     * Imports a private key from PKCS#8 format.
     * 
     * @param {Uint8Array} privateKeyBytes - The private key in Uint8Array format
     * @param {string} [curve=ECDSA.curves.P256] - The elliptic curve used (default: P-256)
     * @param {boolean} [exportable=false] - Whether the imported key should be exportable (default: false)
     * @returns {Promise<CryptoKey>} The imported private key as CryptoKey
     */
    async importPrivateKey(privateKeyBytes, curve = ECDSA.curves.P256, exportable = false) {
        return window.crypto.subtle.importKey(
            "pkcs8",
            privateKeyBytes,
            {
                name: "ECDSA",
                namedCurve: curve,
            },
            exportable,
            ["sign"]
        );
    }
}