import { date } from "../utils/dateUtils.js";

export class HtmlSecretsRender {
    static id = 0;
    /**
     * In base al tipo di segreto, viene restituita la corrispettiva icona (html completo)
     * @param {number} secret_type 
     * @returns {string}
     */
    static get_html_icon(secret_type) {
        secret_type = Number(secret_type);
        // ---
        let icon = null;
        if (secret_type === 0) icon = 'key_vertical';
        else if (secret_type === 1) icon = 'sticky_note_2';
        else if (secret_type === 2) icon = 'credit_card';
        else if (secret_type === 4) icon = 'instant_mix';
        else if (secret_type === 5) icon = 'vpn_lock_2';
        if (icon) return `<span class="material-symbols-rounded">${icon}</span>`;
        // ---
        if (secret_type === 3) return `<div class="flex"><span class="material-symbols-rounded trans rotate _180">key_vertical</span><span class="material-symbols-rounded" style="margin-left: -15px;">key_vertical</span></div>`;
    }
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
        if (secret_type === 4) return this.env(vals);
        if (secret_type === 5) return this.connection(vals);
        return false;
    }
    /**
     * Restituisce il colore associato in base al tipo di segreto
     * @param {number} secret_type 
     * @returns {string|null}
     */
    static get_color(secret_type) {
        secret_type = Number(secret_type);
        if (secret_type === 0) return "orange";
        if (secret_type === 1) return "lightblue";
        if (secret_type === 2) return "yellow";
        if (secret_type === 3) return "purple";
        if (secret_type === 4) return "red";
        if (secret_type === 5) return "peach";
        return null;
    }
    /**
     * Restituisce il nome relativo a un tipo di segreto
     * @param {number} st 
     * @returns 
     */
    static get_secret_type_name(st) {
        return ['login', 'note', 'creditcard', 'publickeys', 'env', 'connection'][st];
    }
    /**
     * HTML PER I VAULT
     * @param {object} vals
     * @return {string} HTML
     */
    static vault(vals = {}) {
        HtmlSecretsRender.id++;
        const update = vals.T !== undefined && vals.T !== '';
        const btn = `btn-${update ? 'copy' : 'paste'}`;
        return `<div class="isle bg-4 mb-2">
    <label for="titolo-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">tag</span>
        Title
    </label>
    <div class="flex gap-50">
        <input spellcheck="false" name="T" type="text" class="input-text mono" id="titolo-${HtmlSecretsRender.id}" value="${vals.T ?? ''}" autocomplete="off" required>
        <${btn} target="titolo-${HtmlSecretsRender.id}"></${btn}>
    </div>
</div>
<!-- USERNAME -->
<div class="isle bg-4 mb-2">
    <label for="username-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">person</span>
        Username
    </label>
    <div class="flex gap-50">
        <input spellcheck="false" name="U" type="text" class="input-text mono" ${!update ? 'list="used-username"' : ''} id="username-${HtmlSecretsRender.id}" value="${vals.U ?? ''}" autocomplete="off">
        <${btn} target="username-${HtmlSecretsRender.id}"></${btn}>
    </div>
    ${!update ? '<datalist id="used-username"></datalist>' : ''}
</div>
<!-- PASSWORD -->
<div class="isle bg-4 mb-2">
    <label for="password-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">key_vertical</span>
        Password
    </label>
    <div class="flex gap-50 mb-2">
        <input spellcheck="false" name="P" type="text" class="input-text mono protected" id="password-${HtmlSecretsRender.id}" value="${vals.P ?? ''}" autocomplete="off" required>
        <${btn} target="password-${HtmlSecretsRender.id}"></${btn}>
    </div>
    <password-strength-bar class="m-0" xs="true" value="100" id="create-psw-strength-bar" input-id="password-${HtmlSecretsRender.id}"></password-strength-bar>
</div>
<!-- OTP/TOTP -->
<div class="isle bg-4 mb-2">
    <label for="totp-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">phonelink_lock</span>
        OTP/TOTP
    </label>
    <div class="flex gap-50">
        <input spellcheck="false" name="O" type="text" class="input-text mono protected" id="totp-${HtmlSecretsRender.id}" value="${vals.O ?? ''}" autocomplete="off">
        <${btn} target="totp-${HtmlSecretsRender.id}"></${btn}>
    </div>
    ${update ? `<div class="mt-2"><otp-copy-button class="btn primary mt-2" secret="${vals.O}"></otp-copy-button></div>` : ''}
</div>
<!-- URL -->
<div class="isle bg-4 mb-2">
    <label for="url-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">link</span>
        URLs
    </label>
    <div class="container-input-text">
        <textarea spellcheck="false" name="H" id="url-${HtmlSecretsRender.id}" rows="3">${vals.H ?? ''}</textarea>
    </div>
    <p class="description mb-0">
        Enter one or more URLs associated with this login.
        You can separate multiple entries with commas or line breaks.
        To use a regular expression, wrap the pattern like /example\\.com/r.
    </p>
</div>
<!-- CUSTOM -->
<div class="custom-sections flex d-column emb" id="${update ? 'update-' : ''}custom-sections-vault">
    <!-- ... -->
</div>
<!-- NOTE -->
<div class="isle bg-4 mb-2">
    <label for="note-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">info</span>
        Note
    </label>
    <div class="container-input-text">
        <textarea spellcheck="false" name="N" id="note-${HtmlSecretsRender.id}" rows="4">${vals.N ?? ''}</textarea>
    </div>
</div>`;
    }


    /**
     * HTML PER LE NOTE
     * @param {object} vals 
     * @return {string} HTML
     */
    static note(vals = {}) {
        HtmlSecretsRender.id++;
        const update = vals.T !== undefined;
        return `<div class="isle bg-4 mb-2">
    <label for="titolo-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">tag</span>
        Title
    </label>
    <input spellcheck="false" name="T" type="text" class="input-text mono" id="titolo-${HtmlSecretsRender.id}" value="${vals.T ?? ''}" autocomplete="off" required>
</div>
<!-- NOTE -->
<div class="isle bg-4">
    <label for="note-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">info</span>
        Note
    </label>
    <div class="container-input-text">
        <textarea spellcheck="false" name="N" id="note-${HtmlSecretsRender.id}" rows="16">${vals.N ?? ''}</textarea>
    </div>
</div>
<!-- CUSTOM -->
<div class="custom-sections flex d-column emt mb-2" id="${update ? 'update-' : ''}custom-sections-vault">
    <!-- ... -->
</div>`
    }

    /**
     * HTML PER LE CHIAVI ASIMMETRICHE
     * @param {object} vals 
     * @return {string} HTML
     */
    static public_key(vals = {}) {
        HtmlSecretsRender.id++;
        const update = vals.T !== undefined;
        return `<div class="isle bg-4 mb-2">
    <label for="titolo-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">tag</span>
        Title
    </label>
    <input spellcheck="false" name="T" type="text" class="input-text mono" id="titolo-${HtmlSecretsRender.id}" value="${vals.T ?? ''}" autocomplete="off" required>
</div>
<!-- TIPO DI CHIAVE == KT -->
<div class="isle bg-4 mb-2">
    <label for="key-type-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">category</span>
        Key type
    </label>
    <select name="KT" id="key-type-${HtmlSecretsRender.id}" class="input-text" required>
        <option value="RSA" ${vals.KT === 'RSA' ? 'selected' : ''}>RSA</option>
        <option value="ECDSA" ${vals.KT === 'ECDSA' ? 'selected' : ''}>ECDSA</option>
        <option value="ED25519" ${vals.KT === 'ED25519' ? 'selected' : ''}>ED25519</option>
        <option value="ECDH" ${vals.KT === 'ECDH' ? 'selected' : ''}>ECDH</option>
    </select>
</div>
<!-- CHIAVE PRIVATA = R -->
<div class="isle bg-4 mb-2">
    <label for="private-key-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">key</span>
        Private Key
    </label>
    <div class="container-input-text mono">
        <textarea spellcheck="false" name="R" type="text" id="private-key-${HtmlSecretsRender.id}" class="monospace" rows="4" placeholder="-----BEGIN PRIVATE KEY-----" autocomplete="off" required>${vals.R ?? ''}</textarea>
    </div>
    <div class="flex gap-50 mt-2">
        <btn-copy target="private-key-${HtmlSecretsRender.id}"></btn-copy>
        <btn-paste target="private-key-${HtmlSecretsRender.id}"></btn-paste>
    </div>
</div>
<!-- CHIAVE PUBBLICA = P -->
<div class="isle bg-4 mb-2">
    <label for="public-key-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">public</span>
        Public Key
    </label>
    <div class="container-input-text">
        <textarea spellcheck="false" name="P" type="text" id="public-key-${HtmlSecretsRender.id}" class="monospace" rows="4" placeholder="-----BEGIN PUBLIC KEY-----" autocomplete="off" required>${vals.P ?? ''}</textarea>
    </div>
    <div class="flex gap-50 mt-2">
        <btn-copy target="public-key-${HtmlSecretsRender.id}"></btn-copy>
        <btn-paste target="public-key-${HtmlSecretsRender.id}"></btn-paste>
    </div>
</div>
<!-- CUSTOM -->
<div class="custom-sections flex d-column emb" id="${update ? 'update-' : ''}custom-sections-vault">
    <!-- ... -->
</div>
<!-- NOTE -->
<div class="isle bg-4 mb-2">
    <label for="note-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">info</span>
        Note
    </label>
    <div class="container-input-text">
        <textarea spellcheck="false" name="N" id="note-${HtmlSecretsRender.id}" rows="4">${vals.N ?? ''}</textarea>
    </div>
</div>`;
    }

    /**
     * HTML PER CARDE DI CREDITO
     * @param {object} vals 
     * @return {string} HTML
     */
    static credit_card(vals = {}) {
        HtmlSecretsRender.id++;
        const update = vals.T !== undefined;
        const btn = `btn-${update ? 'copy' : 'paste'}`;
        return `<div class="isle bg-4 mb-2">
    <label for="titolo-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">tag</span>
        Title
    </label>
    <div class="flex gap-50">
        <input spellcheck="false" name="T" type="text" class="input-text mono" id="titolo-${HtmlSecretsRender.id}" value="${vals.T ?? ''}" autocomplete="off" required placeholder="My Bank">
        <${btn} target="titolo-${HtmlSecretsRender.id}"></${btn}>
    </div>
</div>
<!-- NOME E COGNOME -->
<div class="isle bg-4 mb-2">
    <label for="name-surname-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">person</span>
        Name
    </label>
    <div class="flex gap-50">
        <input spellcheck="false" name="NC" type="text" class="input-text mono" id="name-surname-${HtmlSecretsRender.id}" value="${vals.NC ?? ''}" autocomplete="off" placeholder="John Doe">
        <${btn} target="name-surname-${HtmlSecretsRender.id}"></${btn}>
    </div>
</div>
<!-- NUMERO CARTA -->
<div class="isle bg-4 mb-2">
    <label for="card-number-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">credit_card</span>
        Card number
    </label>
    <div class="flex gap-50">
        <input spellcheck="false" name="CN" type="text" inputmode="numeric" maxlength="19" class="input-text mono protected" id="card-number-${HtmlSecretsRender.id}" value="${vals.CN ?? ''}" autocomplete="off" required placeholder="0000 0000 0000 0000">
        <${btn} target="card-number-${HtmlSecretsRender.id}" callback="rmSpace"></${btn}>
    </div>
</div>
<!-- PIN DELLA CARTA -->
<div class="isle bg-4 mb-2">
    <label for="card-pin-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">password</span>
        Pin
    </label>
    <div class="flex gap-50">
        <input spellcheck="false" name="PI" type="text" inputmode="numeric" class="input-text mono protected" maxlength="10" id="card-pin-${HtmlSecretsRender.id}" value="${vals.PI ?? ''}" placeholder="1234" autocomplete="off">
        <${btn} target="card-pin-${HtmlSecretsRender.id}"></${btn}>
    </div>
</div>
<!-- DATA SCADENZA & CVV -->
<div class="flex d-row gap-50 isle bg-4 mb-2">
    <!-- DATA SCADENZA -->
    <div class="fg-1">
        <label for="expire-date-${HtmlSecretsRender.id}">
            <span class="material-symbols-rounded">calendar_today</span>
            Expiry date
        </label>
        <input spellcheck="false" name="ED" type="text" class="input-text mono" id="expire-date-${HtmlSecretsRender.id}" value="${vals.ED ?? ''}" autocomplete="off" maxlength="8" placeholder="00/00" required>
    </div>
    <!-- CVV -->
    <div class="fg-1" style="max-width:111px">
        <label for="cvv-${HtmlSecretsRender.id}">
            <span class="material-symbols-rounded">pin</span>
            CVV
        </label>
        <input spellcheck="false" name="CV" type="text" inputmode="numeric" class="input-text mono" id="cvv-${HtmlSecretsRender.id}" value="${vals.CV ?? ''}" autocomplete="off" maxlength="3" placeholder="000" required>
    </div>
</div>
<!-- IBAN -->
<div class="isle bg-4 mb-2">
    <label for="iban-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">account_balance</span>
        IBAN
    </label>
    <div class="flex gap-50">
        <input spellcheck="false" name="IB" type="text" class="input-text mono" maxlength="34" id="iban-${HtmlSecretsRender.id}" value="${vals.IB ?? ''}" placeholder="IT60X0542811101000000123456" autocomplete="off">
        <${btn} target="iban-${HtmlSecretsRender.id}"></${btn}>
    </div>
</div>
<!-- CUSTOM -->
<div class="custom-sections flex d-column emb" id="${update ? 'update-' : ''}custom-sections-vault">
    <!-- ... -->
</div>`;
    }

    /**
     * HTML PER LE ENVIROMENTS
     * @param {object} vals 
     * @return {string} HTML
     */
    static env(vals = {}) {
        HtmlSecretsRender.id++;
        const update = vals.T !== undefined;
        return `<div class="isle bg-4 mb-2">
    <label for="titolo-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">tag</span>
        Title
    </label>
    <input spellcheck="false" name="T" type="text" class="input-text mono" id="titolo-${HtmlSecretsRender.id}" value="${vals.T ?? ''}" autocomplete="off" required>
</div>
<!-- RAW ENV -->
<div class="isle bg-4">
    <label for="raw-env-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">lock</span>
        Enviroments
    </label>
    <div class="container-input-text">
        <textarea spellcheck="false" class="monospace" name="R" id="raw-env-${HtmlSecretsRender.id}" rows="16">${vals.R ?? ''}</textarea>
    </div>
    ${update ? `<div id="formatted-env-update" class="isle bg-1 formatted-env" style="display: none"></div>` : ''}
    <div class="flex gap-50 mt-2">
        ${update ? `<button type="button" class="btn primary export-to-env" data-target="raw-env-${HtmlSecretsRender.id}" title="Export as .env"><span class="material-symbols-rounded">download</span></button>` : ''}
        ${update ? `<btn-copy target="raw-env-${HtmlSecretsRender.id}"></btn-copy>` : ''}
        ${update ? `<button type="button" class="btn primary format-env-textarea last" data-input="raw-env-${HtmlSecretsRender.id}" data-output="formatted-env-update" title="Toggle beautify"><span class="material-symbols-rounded">brush</span> Toggle beautify</button>` : ''}
        ${!update ? `<btn-paste target="raw-env-${HtmlSecretsRender.id}"></btn-paste>` : ''}
    </div>
</div>
<!-- CUSTOM -->
<div class="custom-sections flex d-column emt mb-2" id="${update ? 'update-' : ''}custom-sections-vault">
    <!-- ... -->
</div>`
    }
    /*
    {
      T: "PostgreSQL - Prod",   // Titolo (nome connessione)
      H: "prod.db.internal",    // Hostname
      P: 5432,                  // Porta
      U: "postgres",            // Username
      K: "*****",               // Password o key
      S: "postgresql",          // Tipo di servizio (es: pg, mysql, sftp, wireguard)
      N: "DB di produzione",    // Note
      C: "postgresql://..."     // (facoltativo) Connection string generata o inserita
    }
    */
    /**
     * HTML PER LE CONNESSIONI (DB, SFTP, VPN...)
     * @param {object} vals 
     * @return {string} HTML
     */
    static connection(vals = {}) {
        HtmlSecretsRender.id++;
        const update = vals.T !== undefined;
        const btn = `btn-${update ? 'copy' : 'paste'}`;
        return `<div class="isle bg-4 mb-2">
    <label for="titolo-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">tag</span>
        Title
    </label>
    <div class="flex gap-50">
        <input spellcheck="false" name="T" type="text" class="input-text mono" id="titolo-${HtmlSecretsRender.id}" value="${vals.T ?? ''}" placeholder="PostgreSQL - Prod" autocomplete="off" required>
        <${btn} target="titolo-${HtmlSecretsRender.id}"></${btn}>
    </div>
</div>
<!-- HOSTNAME -->
<div class="isle bg-4 mb-2">
    <label for="hostname-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">link</span>
        Hostname
    </label>
    <div class="flex gap-50">
        <input spellcheck="false" name="H" type="text" class="input-text mono" id="hostname-${HtmlSecretsRender.id}" value="${vals.H ?? ''}" placeholder="prod.db.internal" autocomplete="off">
        <${btn} target="hostname-${HtmlSecretsRender.id}"></${btn}>
    </div>
</div>
<!-- PORT -->
<div class="isle bg-4 mb-2">
    <label for="port-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">door_front</span>
        Port
    </label>
    <div class="flex gap-50">
        <input spellcheck="false" name="P" inputmode="numeric" class="input-text mono" id="port-${HtmlSecretsRender.id}" value="${vals.P ?? ''}" placeholder="5432" autocomplete="off">
        <${btn} target="port-${HtmlSecretsRender.id}"></${btn}>
    </div>
</div>
<!-- USERNAME -->
<div class="isle bg-4 mb-2">
    <label for="username-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">person</span>
        Username
    </label>
    <div class="flex gap-50">
        <input spellcheck="false" name="U" type="text" class="input-text mono" id="username-${HtmlSecretsRender.id}" value="${vals.U ?? ''}" placeholder="postgres" autocomplete="off">
        <${btn} target="username-${HtmlSecretsRender.id}"></${btn}>
    </div>
</div>
<!-- PASSWORD -->
<div class="isle bg-4 mb-2">
    <label for="password-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">key_vertical</span>
        Password / Key
    </label>
    <div class="flex gap-50 mb-2">
        <input spellcheck="false" name="K" type="text" class="input-text mono protected" id="password-${HtmlSecretsRender.id}" value="${vals.K ?? ''}" placeholder="*****" autocomplete="off">
        <${btn} target="password-${HtmlSecretsRender.id}"></${btn}>
    </div>
    <password-strength-bar class="m-0" xs="true" value="100" id="create-psw-strength-bar" input-id="password-${HtmlSecretsRender.id}"></password-strength-bar>
</div>
<!-- SERVICE -->
<div class="isle bg-4 mb-2">
    <label for="service-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">settings</span>
        Service
    </label>
    <div class="flex gap-50">
        <input spellcheck="false" name="S" type="text" class="input-text mono" id="service-${HtmlSecretsRender.id}" value="${vals.S ?? ''}" autocomplete="off" placeholder="pg, mysql, sftp, wireguard">
        <${btn} target="service-${HtmlSecretsRender.id}"></${btn}>
    </div>
</div>
<!-- CUSTOM -->
<div class="custom-sections flex d-column emb" id="${update ? 'update-' : ''}custom-sections-vault">
    <!-- ... -->
</div>
<!-- NOTE -->
<div class="isle bg-4 mb-2">
    <label for="note-${HtmlSecretsRender.id}">
        <span class="material-symbols-rounded">info</span>
        Note
    </label>
    <div class="container-input-text">
        <textarea spellcheck="false" name="N" id="note-${HtmlSecretsRender.id}" rows="4">${vals.N ?? ''}</textarea>
    </div>
</div>`;
    }
    /**
     * Restituisce il contesto di ricerca di ogni vault list item
     * @param {Object} vals 
     * @param {number} st secret type [0 = login, 1 = note, 2 = carta di credito, 3 = publickeys]
     * @returns {string}
     * Come effettuare la ricerca:
     *  * '#' -> identifica una categoria e sono: 
     *    * titoli dei vault
     *    * tipi di vault:
     *      * login
     *      * note
     *      * creditcard
     *      * publickeys
     *    * password deboli -> #danger
     *    * vault che hanno il codice totp -> #totp
     *  * '?' usato per le date, sono due tipi:
     *    * date specifiche, es:
     *      * ?1-2-24 -> "Quando? il giorno 1 Febbraio 2024"
     *    * date generiche, es:
     *      * ?y2024 -> "Quando? nell'anno 2024"
     *      * ?m4 -> "Quando? nel mese di Aprile"
     *      * ?m4?y2024 -> "Quando? nel mese di Aprile dell'anno 2024"
     *      * ?d10 -> "Quando? Il giorno 10 di qualsiasi mese o anno"
     *   * '@' usato per gli usernames dei login
     */
    static get_search_context(vals, st) {
        let context = [];
        // -- inserisco il Secret Type
        // - # in questo caso lo intendo come "mostrami tutti i segreti di tipo ..."
        context.push(`#${this.get_secret_type_name(st)}`);
        // -- inserisco il titolo
        // -- anche qui uso #, dovrebbe essere inteso come categoria ma puo andare bene anche qui
        context.push(`#${vals.secrets.T}` ?? "");
        // -- data
        // - ? inteso come "Quando?" seguendo quindi una data
        // - ho inserito due tipi di date per ricerce specifiche o generiche
        // -- per la specifica: 
        // --- ?1-2-24 -> "Quando? il giorno 1 Febbraio 2024"
        // -- per quelle generiche invece, ad esempio:
        // --- ?y2024 -> "Quando? nell'anno 2024"
        // --- ?m4 -> "Quando? nel mese di Aprile"
        // --- ?m4?y2024 -> "Quando? nel mese di Aprile dell'anno 2024"
        context.push(date.format("?%j-%n-%Y|?d%j?m%n?y%Y", new Date(vals.updatedAt)));
        // -- se è presente un username
        // - @ intesto come "Chi? | Quale username?"
        if (vals.secrets.U) context.push(`@${vals.secrets.U}`);
        // -- se è un login e la password non è sicura
        // - # indica una categoria
        // -- in questo caso la categoria di password non sicure
        if (vals.strength_value && vals.strength_value < 60) context.push(`#danger`);
        // -- se è presente un codice otp
        // -- in questo caso tutti i login che hanno un totp
        if (vals.secrets.O) context.push(`#totp`);
        // ---
        return context.join('|').toLowerCase();
    }
    /**
     * Restituisce il codice html appropriato
     * @param {number} st 
     * @param {object} vals 
     */
    static get_list_item(st, vals) {
        return `<vault-li 
    search-context="${this.get_search_context(vals, st)}"
    title="${vals.secrets.T}"
    st="${st}"
    updated-at="${date.format("%j %M %y", new Date(vals.updatedAt))}"
    ${vals.strength_value ? `secure="${vals.strength_value && vals.strength_value > 60}"` : ''}
    id="${vals.id}"
></vault-li>`;
    }
}