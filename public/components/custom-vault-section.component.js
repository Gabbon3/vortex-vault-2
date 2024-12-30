class CustomVaultSection extends HTMLElement {
    static id_ctr = 0;
    constructor() {
        super();
        this.input = null;
        this.name = null;
        this.icon = null;
        this.svg = null;
    }

    connectedCallback() {
        this.render();
    }
    
    /**
     * Restituisce un icona adatta a rappresentare la sezione indicata
     * @param {string} section_name 
     * @returns {string} 
     */
    static get_icon(section_name) {
        section_name = section_name.toLowerCase().trim();
        let svg = null;
        // ---
        const iconMap = [
            { keywords: ["username", "user", "utente", "profilo"], svg: "person" },
            { keywords: ["password", "psw", "codice"], svg: "key_vertical" },
            { keywords: ["chiave", "key", "accesso", "secret"], svg: "key" },
            { keywords: ["titolo", "nome", "label"], svg: "tag" },
            { keywords: ["private", "privato", "sicuro"], svg: "lock" },
            { keywords: ["mail", "email", "posta"], svg: "alternate_email" },
            { keywords: ["note", "info", "informazioni"], svg: "info" },
            { keywords: ["pin", "number", "numero", "cvv"], svg: "pin" },
            { keywords: ["codice", "code"], svg: "password" },
            { keywords: ["address", "indirizzo", "location", "via"], svg: "location_on" },
            { keywords: ["card", "credito", "debit", "carta", "visa", "mastercard"], svg: "credit_card" },
            { keywords: ["phone", "telefono", "cellulare", "mobile"], svg: "phone" },
            { keywords: ["url", "site", "website", "link", "web"], svg: "link" },
            { keywords: ["birthday", "nascita", "data", "anniversario"], svg: "event" },
            { keywords: ["social", "facebook", "twitter", "instagram", "linkedin"], svg: "share" },
            { keywords: ["document", "doc", "file", "pdf", "documento"], svg: "description" },
            { keywords: ["security", "domanda", "answer", "risposta"], svg: "help" },
            { keywords: ["bank", "conto", "iban", "swift", "banca"], svg: "account_balance" },
            { keywords: ["personal", "note", "appunto", "memo"], svg: "sticky_note_2" },
            { keywords: ["date"], svg: "calendar_today" }
        ];
        // -- cerco l'icona
        svg = iconMap.find((item) =>
            item.keywords.some((keyword) => section_name.includes(keyword))
        )?.svg;
        return svg ?? 'text_fields';
    }

    render() {
        CustomVaultSection.id_ctr++;
        const input_id = this.getAttribute('input-id');
        const input_value = this.getAttribute('input-value') ?? '';
        const section_name = this.getAttribute('section-name') ?? 'Custom';
        const paste = JSON.parse(this.getAttribute('paste'));
        // ---
        this.svg = CustomVaultSection.get_icon(section_name);
        const is_password = ['password', 'key', 'key_vertical'].includes(this.svg);
        // ---
        this.innerHTML = `
            <label for="${input_id}">
                <span class="material-symbols-rounded custom-input-icon">${this.svg}</span>
                <input class="input-text input-name">
                <button type="button" class="btn t remove-custom-section" title="Remove this section">
                    <span class="material-symbols-rounded">close</span>
                </button>
            </label>
            <div class="flex gap-50">
                <input name="${section_name}" value="${input_value}" type="text" class="input-text mono custom-input" id="${input_id}" autocomplete="off" required>
                <button class="btn t CA ${paste ? 'paste' : 'copy'}-val" data-target-${paste ? 'pa' : 'cc'}="${input_id}" type="button" title="Paste">
                    <span class="material-symbols-rounded">${paste ? 'content_paste' : 'content_copy'}</span>
                </button>
            </div>
            ${is_password ? `<password-strength-bar class="m-0 mt-2" xs="true" value="${ptg.test(input_value).average}" id="cvsp-${CustomVaultSection.id_ctr}" input-id="${input_id}"></password-strength-bar>` : ''}
        `;
        // -- VARIABILI
        this.input = this.querySelector('.custom-input');
        this.name = this.querySelector('.input-name');
        this.icon = this.querySelector('.custom-input-icon');
        this.name.value = section_name;
        // -- EVENTI
        this.querySelector('.remove-custom-section').addEventListener('click', this.delete.bind(this));
        // - modifica il name dell'input quando l'input dedicato al nome appunto viene modificato
        // - modifica anche l'icona in tempo reale in base a quello che scrive
        this.name.addEventListener('keyup', () => {
            this.input.name = this.name.value;
            const svg = CustomVaultSection.get_icon(this.name.value);
            if (svg !== this.svg) this.icon.textContent = svg;
        });
    }
    /**
     * Elimina la sezione html
     * @returns 
     */
    delete() {
        if (!confirm('Are you sure you want to remove this section?')) return;
        this.remove();
    }
}

customElements.define("custom-vault-section", CustomVaultSection);