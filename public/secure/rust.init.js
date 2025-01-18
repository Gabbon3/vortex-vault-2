import init, { derive_key } from '../pkg/argon2.js';

async function initRustWasm() {
    await init({});
    // -- creo la funzione
    /**
     * Genera chiavi crittografiche usando Argon2id
     * @param {Uint8Array} password 
     * @param {Uint8Array} salt 
     * @return {Uint8Array}
     */
    window.Argon2 = (password, salt) => {
        return derive_key(password, salt);
    }
}

initRustWasm();