import { date } from "../utils/dateUtils.js";

export class HtmlSecretsRender {
    static id = 0;
    /**
     * Restituisce l'html appropriato in base al tipo di dati richiesto
     * vault: 0
     * note: 1
     * card: 2
     * @param {number} secret_type 
     * @param {object} vals 
     * @returns {string} l'html completo
     */
    static get_by_type(secret_type, vals) {
        secret_type = Number(secret_type);
        if (secret_type === 0) return this.vault(vals);
        if (secret_type === 1) return this.note(vals);
        if (secret_type === 2) return this.credit_card(vals);
        if (secret_type === 3) return this.public_key(vals);
        return false;
    }
    /**
     * Restituisce il colore associato in base al tipo di segreto
     * @param {number} secret_type 
     * @returns {string|boolean}
     */
    static get_color(secret_type) {
        secret_type = Number(secret_type);
        if (secret_type === 0) return "orange";
        if (secret_type === 1) return "lightblue";
        if (secret_type === 2) return "yellow";
        if (secret_type === 3) return "purple";
        return false;
    }
    /**
     * HTML PER I VAULT
     * @param {object} vals 
     * @return {string} HTML
     */
    static vault(vals = {}) {
        this.id++;
        const update = vals.T !== undefined;
        const btn = `btn-${update ? 'copy' : 'paste'}`;
        return `<div class="isle bg-4 mb-2">
    <label for="titolo-${this.id}">
        <span class="material-symbols-rounded">tag</span>
        Title
    </label>
    <div class="flex gap-50">
        <input name="T" type="text" class="input-text mono" id="titolo-${this.id}" value="${vals.T ?? ''}" autocomplete="off" required>
        <${btn} target="titolo-${this.id}"></${btn}>
    </div>
</div>
<!-- USERNAME -->
<div class="isle bg-4 mb-2">
    <label for="username-${this.id}">
        <span class="material-symbols-rounded">person</span>
        Username
    </label>
    <div class="flex gap-50">
        <input name="U" type="text" class="input-text mono" ${!update ? 'list="used-username"' : ''} id="username-${this.id}" value="${vals.U ?? ''}" autocomplete="off">
        <${btn} target="username-${this.id}"></${btn}>
    </div>
    ${!update ? '<datalist id="used-username"></datalist>' : ''}
</div>
<!-- PASSWORD -->
<div class="isle bg-4 mb-2">
    <label for="password-${this.id}">
        <span class="material-symbols-rounded">key_vertical</span>
        Password
    </label>
    <div class="flex gap-50 mb-2">
        <input name="P" type="text" class="input-text mono" id="password-${this.id}" value="${vals.P ?? ''}" autocomplete="off" required>
        <${btn} target="password-${this.id}"></${btn}>
    </div>
    <password-strength-bar class="m-0" xs="true" value="100" id="create-psw-strength-bar" input-id="password-${this.id}"></password-strength-bar>
</div>
<!-- OTP/TOTP -->
<div class="isle bg-4 mb-2">
    <label for="totp-${this.id}">
        <span class="material-symbols-rounded">phonelink_lock</span>
        OTP/TOTP
    </label>
    <div class="flex gap-50">
        <input name="O" type="text" class="input-text mono" id="totp-${this.id}" value="${vals.O ?? ''}" autocomplete="off">
        <${btn} target="totp-${this.id}"></${btn}>
    </div>
    ${update ? `<div class="mt-2"><otp-copy-button class="btn primary mt-2" secret="${vals.O}"></otp-copy-button></div>` : ''}
</div>
<!-- CUSTOM -->
<div class="custom-sections flex d-column emb" id="${update ? 'update-' : ''}custom-sections-vault">
    <!-- ... -->
</div>
<!-- NOTE -->
<div class="isle bg-4 mb-2">
    <label for="note-${this.id}">
        <span class="material-symbols-rounded">info</span>
        Note
    </label>
    <textarea name="N" id="note-${this.id}" class="input-text" rows="3">${vals.N ?? ''}</textarea>
</div>`;
    }


    /**
     * HTML PER LE NOTE
     * @param {object} vals 
     * @return {string} HTML
     */
    static note(vals = {}) {
        this.id++;
        const update = vals.T !== undefined;
        return `<div class="isle bg-4 mb-2">
    <label for="titolo-${this.id}">
        <span class="material-symbols-rounded">tag</span>
        Title
    </label>
    <input name="T" type="text" class="input-text mono" id="titolo-${this.id}" value="${vals.T ?? ''}" autocomplete="off" required>
</div>
<!-- NOTE -->
<div class="isle bg-4">
    <label for="note-${this.id}">
        <span class="material-symbols-rounded">info</span>
        Note
    </label>
    <textarea name="N" id="note-${this.id}" class="input-text" rows="16">${vals.N ?? ''}</textarea>
</div>
<!-- CUSTOM -->
<div class="custom-sections flex d-column emt" id="${update ? 'update-' : ''}custom-sections-vault">
    <!-- ... -->
</div>`
    }

    /**
     * HTML PER LE CHIAVI ASIMMETRICHE
     * @param {object} vals 
     * @return {string} HTML
     */
    static public_key(vals = {}) {
        this.id++;
        const update = vals.T !== undefined;
        return `<div class="isle bg-4 mb-2">
    <label for="titolo-${this.id}">
        <span class="material-symbols-rounded">tag</span>
        Title
    </label>
    <input name="T" type="text" class="input-text mono" id="titolo-${this.id}" value="${vals.T ?? ''}" autocomplete="off" required>
</div>
<!-- TIPO DI CHIAVE == KT -->
<div class="isle bg-4 mb-2">
    <label for="key-type-${this.id}">
        <span class="material-symbols-rounded">category</span>
        Key type
    </label>
    <select name="KT" id="key-type-${this.id}" class="input-text" required>
        <option value="RSA" ${vals.KT === 'RSA' ? 'selected' : ''}>RSA</option>
        <option value="ECDSA" ${vals.KT === 'ECDSA' ? 'selected' : ''}>ECDSA</option>
        <option value="ED25519" ${vals.KT === 'ED25519' ? 'selected' : ''}>ED25519</option>
        <option value="ECDH" ${vals.KT === 'ECDH' ? 'selected' : ''}>ECDH</option>
    </select>
</div>
<!-- CHIAVE PRIVATA = R -->
<div class="isle bg-4 mb-2">
    <label for="private-key-${this.id}">
        <span class="material-symbols-rounded">key_vertical</span>
        Private Key
    </label>
    <textarea name="R" type="text" class="input-text mono" id="private-key-${this.id}" rows="4" placeholder="-----BEGIN PRIVATE KEY-----" autocomplete="off" required>${vals.R ?? ''}</textarea>
    <div class="flex gap-50 mt-2">
        <btn-copy target="private-key-${this.id}"></btn-copy>
        <btn-paste target="private-key-${this.id}"></btn-paste>
    </div>
</div>
<!-- CHIAVE PUBBLICA = P -->
<div class="isle bg-4 mb-2">
    <label for="public-key-${this.id}">
        <span class="material-symbols-rounded">public</span>
        Public Key
    </label>
    <textarea name="P" type="text" class="input-text mono" id="public-key-${this.id}" rows="4" placeholder="-----BEGIN PUBLIC KEY-----" autocomplete="off" required>${vals.P ?? ''}</textarea>
    <div class="flex gap-50 mt-2">
        <btn-copy target="public-key-${this.id}"></btn-copy>
        <btn-paste target="public-key-${this.id}"></btn-paste>
    </div>
</div>
<!-- CUSTOM -->
<div class="custom-sections flex d-column emb" id="${update ? 'update-' : ''}custom-sections-vault">
    <!-- ... -->
</div>
<!-- NOTE -->
<div class="isle bg-4 mb-2">
    <label for="note-${this.id}">
        <span class="material-symbols-rounded">info</span>
        Note
    </label>
    <textarea name="N" id="note-${this.id}" class="input-text" rows="3">${vals.N ?? ''}</textarea>
</div>`;
    }

    /**
     * HTML PER CARDE DI CREDITO
     * @param {object} vals 
     * @return {string} HTML
     */
    static credit_card(vals = {}) {
        this.id++;
        const update = vals.T !== undefined;
        const btn = `btn-${update ? 'copy' : 'paste'}`;
        return `<div class="isle bg-4 mb-2">
    <label for="titolo-${this.id}">
        <span class="material-symbols-rounded">tag</span>
        Title
    </label>
    <div class="flex gap-50">
        <input name="T" type="text" class="input-text mono" id="titolo-${this.id}" value="${vals.T ?? ''}" autocomplete="off" required placeholder="My Bank">
        <${btn} target="titolo-${this.id}"></${btn}>
    </div>
</div>
<!-- NOME E COGNOME -->
<div class="isle bg-4 mb-2">
    <label for="name-surname-${this.id}">
        <span class="material-symbols-rounded">person</span>
        Name
    </label>
    <div class="flex gap-50">
        <input name="NC" type="text" class="input-text mono" id="name-surname-${this.id}" value="${vals.NC ?? ''}" autocomplete="off" placeholder="John Doe">
        <${btn} target="name-surname-${this.id}"></${btn}>
    </div>
</div>
<!-- NUMERO CARTA -->
<div class="isle bg-4 mb-2">
    <label for="card-number-${this.id}">
        <span class="material-symbols-rounded">credit_card</span>
        Card number
    </label>
    <div class="flex gap-50">
        <input name="CN" type="text" class="input-text mono" id="card-number-${this.id}" value="${vals.CN ?? ''}" autocomplete="off" required placeholder="0000 0000 0000 0000">
        <${btn} target="card-number-${this.id}"></${btn}>
    </div>
</div>
<!-- DATA SCADENZA & CVV -->
<div class="flex d-row gap-50 isle bg-4">
    <!-- DATA SCADENZA -->
    <div class="fg-1">
        <label for="expire-date-${this.id}">
            <span class="material-symbols-rounded">calendar_today</span>
            Expiry date
        </label>
        <input name="ED" type="text" class="input-text mono" id="expire-date-${this.id}" value="${vals.ED ?? ''}" autocomplete="off" maxlength="8" placeholder="00/00" required>
    </div>
    <!-- CVV -->
    <div class="fg-1" style="max-width:111px">
        <label for="cvv-${this.id}">
            <span class="material-symbols-rounded">pin</span>
            CVV
        </label>
        <input name="CV" type="text" class="input-text mono" id="cvv-${this.id}" value="${vals.CV ?? ''}" autocomplete="off" maxlength="3" placeholder="000" required>
    </div>
</div>
<!-- CUSTOM -->
<div class="custom-sections flex d-column emt" id="${update ? 'update-' : ''}custom-sections-vault">
    <!-- ... -->
</div>`;
    }
    /**
     * Restituisce il codice html appropriato
     * @param {number} st 
     * @param {object} vals 
     */
    static get_list_item(st, vals) {
        return `<vault-li 
    title="${vals.secrets.T}"
    st="${st}"
    updated-at="${date.format("%j %M %y", new Date(vals.updatedAt))}"
    ${vals.strength_value ? `secure="${vals.strength_value && vals.strength_value > 60}"` : ''}
    id="${vals.id}"
></vault-li>`;
    }
}