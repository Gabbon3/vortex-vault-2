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
        const buffer_public_key = Buffer.from(public_key);
        // -- cerifico la firma con la chiave pubblica
        const verify = crypto.createVerify("SHA256");
        verify.update(buffer_data);
        const is_valid = verify.verify(
            {
                key: buffer_public_key,
                dsaEncoding: "ieee-p1363", // Standard per ECDSA
            },
            buffer_signature
        );
        // ---
        return is_valid;
    }
}
