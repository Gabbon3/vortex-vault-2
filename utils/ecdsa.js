import crypto from "crypto";

export class ECDSA {
    /**
     * Firma digitalmente un dato utilizzando ECDSA con una chiave privata.
     *
     * @param {Uint8Array} data - I dati da firmare.
     * @param {Uint8Array} private_key - La chiave privata in formato binario (P-256).
     * @returns {Uint8Array} - La firma digitale come Uint8Array.
     */
    static sign(data, private_key) {
        const buffer_data = Buffer.from(data);
        const buffer_private_key = Buffer.from(private_key);
        // -- creo la firma usando ECDSA con la curva P-256
        const sign = crypto.createSign("SHA256");
        sign.update(buffer_data);
        const signature = sign.sign({
            key: buffer_private_key,
            dsaEncoding: "ieee-p1363", // Standard per ECDSA
        });
        // ---
        return new Uint8Array(signature);
    }
    /**
     * Verifica una firma digitale utilizzando ECDSA con una chiave pubblica.
     *
     * @param {Uint8Array} data - I dati originali da verificare.
     * @param {Uint8Array} signature - La firma digitale da verificare.
     * @param {Uint8Array} public_key - La chiave pubblica in formato binario (P-256).
     * @returns {boolean} - Restituisce true se la firma è valida, altrimenti false.
     */
    static verify(data, signature, public_key) {
        const buffer_data = Buffer.from(data);
        const buffer_signature = Buffer.from(signature);
        const public_key_pem = this.rawToPem(public_key);
        console.log(public_key_pem);
        // -- verifico la firma con la chiave pubblica
        const verify = crypto.createVerify("SHA256");
        verify.update(buffer_data);
        const is_valid = verify.verify(
            {
                key: public_key_pem,
                dsaEncoding: "ieee-p1363", // Standard per ECDSA
            },
            buffer_signature
        );
        // ---
        return is_valid;
    }
    /**
     * Converte una chiave COSE a PEM
     * @param {Uint8Array} coseKey 
     * @returns {string}
     */
    static rawToPem(publicKeyRaw) {
        // La chiave raw è composta da x (32 byte) + y (32 byte)
        const x = publicKeyRaw.slice(0, 32);
        const y = publicKeyRaw.slice(32, 64);
    
        // Costruzione del formato DER
        const publicKeyDer = Buffer.concat([
            Buffer.from('3059', 'hex'), // SEQUENCE
            Buffer.from('3013', 'hex'), // SEQUENCE
            Buffer.from('0607', 'hex'), // OBJECT IDENTIFIER
            Buffer.from('2A8648CE3D0201', 'hex'), // id-ecPublicKey
            Buffer.from('0608', 'hex'), // OBJECT IDENTIFIER
            Buffer.from('2A8648CE3D030107', 'hex'), // secp256r1
            Buffer.from('0344', 'hex'), // BIT STRING
            Buffer.concat([
                Buffer.from('00', 'hex'), // BIT STRING padding
                Buffer.from('04', 'hex'), // Uncompressed point indicator
                x,
                y,
            ]),
        ]);
    
        // Convertire in formato PEM
        return `-----BEGIN PUBLIC KEY-----\n${publicKeyDer.toString('base64')}\n-----END PUBLIC KEY-----`;
    }
}
