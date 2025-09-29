import { Cripto } from "../secure/cripto.js";
import { vocabolario } from "./vocabolario.js";

// password tester gabbone
export class ptg {
    // static chars = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890!?+*#@$%&";
    static chars = {
        az: "qwertyuiopasdfghjklzxcvbnm",
        AZ: "QWERTYUIOPASDFGHJKLZXCVBNM",
        _09: "1234567890",
        _$: "!?+*#@$%&-",
    };
    static regex = {
        az: /[a-z]/,
        AZ: /[A-Z]/,
        _09: /\d/,
        _$: /[^a-zA-Z0-9]/,
    }
    static sequence_map = {
        1: "12q", 2: "21qw3", 3: "32we4", 4: "43er5",
        5: "54rt6", 6: "65ty7", 7: "76yu8", 8: "87ui9",
        9: "98io0", 0: "09op", q: "q12wa", w: "wxq23esa",
        e: "ef3wsdr4", r: "rs4edft5", t: "tu5rfgy6", y: "yz6tghu7",
        u: "uv7yhji8", i: "i8ujko9", o: "9iklp0", p: "pq0ol",
        a: "abqwsz", s: "swazxde", d: "desxcfr", f: "frdcvgt", 
        g: "gtfvbhy", h: "hygbnju", j: "juhnmki", k: "kijmlo",
        l: "lpokm", z: "zasx", x: "xyzsdc", c: "xddfv",
        v: "vwcfgb", b: "bcvghn", n: "nobhjm", m: "mnjkl"
    };
    /**
     * Genera una password
     * @param {Object} options opzioni di configurazione della password
     * @param {boolean} [options.len=12]
     * @param {boolean} [options.az=true]
     * @param {boolean} [options.AZ=true]
     * @param {boolean} [options._09=true]
     * @param {boolean} [options._$=true]
     */
    static generate(len = 12, az = true, AZ = true, _09 = true, _$ = true ) {
        let password = '';
        // -- costruisco la base da cui estrarre
        let chars = '';
        if (az) chars += this.chars.az;
        if (AZ) chars += this.chars.AZ;
        if (_09) chars += this.chars._09;
        if (_$) chars += this.chars._$;
        // ---
        let tryes = 0;
        let ok = false;
        while (!ok) {
            password = '';
            // ---
            for (let i = 0; i < len; i++) {
                password += chars[Math.floor((Cripto.random_ratio() * chars.length))];
            }
            // ---
            const check = this.check_types(password);
            ok = 
                check.az === az &&
                check.AZ === AZ &&
                check._09 === _09 &&
                check._$ === _$;
            tryes++;
            if (tryes >= 1000) throw new Error("Max tryes reached");
        }
        // ---
        return password;
    }
    /**
     * Genera una password frase
     * @param {Object} options opzioni di configurazione della password
     * @param {boolean} [options.len=4] - numero di parole da usare
     * @param {boolean} [options.az=true]
     * @param {boolean} [options.AZ=true]
     * @param {boolean} [options._09=true]
     * @param {boolean} [options._$=true]
     */
    static generatePassphrase(len = 4, az = true, AZ = false, _09 = false, _$ = false) {
        let password = "";
        const dimensioneVocabolario = vocabolario.length;
        // --
        for (let i = 0; i < len; i++) {
            let parola = vocabolario[Math.floor((Cripto.random_ratio() * dimensioneVocabolario))];
            password += AZ ? (parola.charAt(0).toUpperCase() + parola.slice(1)) : parola;
        }
        if (_09) {
            password += Math.floor(Cripto.random_ratio() * 100);
        }
        if (_$) {
            password += this.chars._$[Math.floor((Cripto.random_ratio() * this.chars._$.length))]; 
        }
        return password;
    }
    /**
     * Restituisce quali tipi di caratteri sono presenti in una password
     * @param {string} psw
     * @returns {Object}
     */
    static check_types(psw) {
        let types = {};
        types.az = this.regex.az.test(psw);
        types.AZ = this.regex.AZ.test(psw);
        types._09 = this.regex._09.test(psw);
        types._$ = this.regex._$.test(psw);
        return types;
    }
    /**
     * Conta il numero di tipi di caratteri presenti in una password
     * @param {string} psw 
     * @returns {number}
     */
    static count_types(psw) {
        let types = 0;
        const check = this.check_types(psw);
        for (const c in check) {
            types += check[c] ? 1 : 0;
        }
        return types;
    }
    /**
     * Ricerca delle sequenze di caratteri vicini in una stringa
     * @param {string} chars 
     * @returns {Array}
     */
    static search_sequence(chars) {
        chars = chars.toLowerCase();
        const l = chars.length - 1;
        // ---
        const sequences = [];
        let sequence = '';
        // ---
        for (let i = 0; i < l; i++) {
            if (this.sequence_map[chars[i]] && this.sequence_map[chars[i]].includes(chars[i + 1])) {
                sequence += chars[i];
            } else {
                if (sequence.length > 0) sequences.push(`${sequence}${chars[i]}`);
                // ---
                sequence = '';
            }
        }
        // -- ultimo controllo
        if (sequence.length > 0) sequences.push(`${sequence}${chars[l]}`);
        // ---
        return sequences.filter(seq => seq.length >= 3);
    }
    /**
     * Calcola in linea generale il punteggio di una password
     * @param {string} password 
     * @returns {Object}
     */
    static test(password) {
        const max_l = 100;
        const max_t = 100;
        const ppt_t = { az: 0.2, AZ: 0.2, _09: 0.2, _$: 0.4 }; // punti per tipo
        const char_set_size = { az: 26, AZ: 26, _09: 10, _$: 15 }
        const max_e = 100; // max entropy
        const max_s = 100;
        const max = max_l + max_t + max_e + max_s;
        // ---
        let ppt = [
            0, // per la lunghezza
            0, // per i tipi di caratteri
            0, // for entropy
            0, // per le sequenze
        ];
        // -- lunghezza
        const l = password.length;
        if (l >= 16) ppt[0] = max_l;
        else {
            // 100 : x = 16 : l
            const e_l = l <= 8 ? 2.5 : 1.5; // esponente lunghezza
            ppt[0] = max_l * Math.pow(l / 16, e_l);
        }
        // -- tipi caratteri
        const types = this.check_types(password);
        const types_count = this.count_types(password);
        let C = 0; // used for entropy calculation
        for (const c in types) {
            if (types[c]) {
                ppt[1] += ppt_t[c] * max_t;
                C += char_set_size[c];
            }
        }
        if (types_count < 3) ppt[1] *= 0.5;
        // -- entropy
        const entropy = this.entropy(l, C);
        ppt[2] = entropy <= max_e ? entropy : max_e;
        // -- sequenze
        const sequences = this.search_sequence(password);
        const s_l = sequences.join('').length; // lunghezza totale delle sequenze
        // - esponente
        const ratio_s = s_l / l;
        const e_s = ratio_s >= 0.5 ? 2 : 1.5; // esponente sequenze
        ppt[3] = max_s * (1 - Math.pow(ratio_s, e_s));
        // -- sum : max = x : 100
        const final_ppt = ppt.map(point => { return Math.floor(point * 1000) / 1000;});
        const table = { 
            length: final_ppt[0], 
            types: final_ppt[1], 
            entropy: final_ppt[2], 
            sequence: final_ppt[3] 
        }
        return {
            average: Math.round(((final_ppt[0] + final_ppt[1] + final_ppt[2] + final_ppt[3]) * 100) / max),
            table
        };
    }
    /**
     * Calculate the entropy of password
     * H = L * log2(C)
     * @param {number} L password length
     * @param {number} C is the size of the character set used.
     * @returns {number} entropy value in bits
     */
    static entropy(L, C) {
        return L * Math.log2(C);
    }
    /**
     * UTILITY HTML
     */
    /**
     * Restituisce il testo suddiviso per tipo con gia l'html inserito
     * @param {string} text 
     */
    static colorize_text(text) {
        const groups = text.match(/([A-Z]+)|([a-z]+)|([0-9]+)|([^a-zA-Z0-9]+)/g) || [];
        return groups.map(group => {
            if (/[a-z]/.test(group)) return `<i class="az">${group}</i>`;
            else if (/[A-Z]/.test(group)) return `<i class="AZ">${group}</i>`;
            else if (/[0-9]/.test(group)) return `<i class="_09">${group}</i>`;
            else return `<i class="_s">${group}</i>`;
        }).join('');
    }
}

// window.ptg = ptg;