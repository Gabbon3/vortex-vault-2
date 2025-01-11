class VaultLi extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        // -- ottengo gli attributi
        const title = this.getAttribute("title");
        const updated_at = this.getAttribute("updated-at");
        const secure = this.getAttribute("secure") === "true";
        const st = this.getAttribute("st");
        const icon = st === '0' ? secure ? 'encrypted' : 'error' : st === '1' ? 'sticky_note_2' : 'credit_card';
        /**
         * vault: 0 verde/rosso
         * note: 1 azzurro
         * card: 2 giallo
         */
        let color = '';
        switch (st) {
            case '0':
                color = secure ? 'orange' : 'red';
                break;
            case '1':
                color = 'lightblue';
                break;
            case '2':
                color = 'yellow';
                break;
        }
        // ---
        this.innerHTML = `
            <div class="simbolo ${color}">
                <span class="material-symbols-rounded">${icon}</span>
            </div>
            <div class="info">
                <strong>${title}</strong>
                <i>${updated_at}</i>
            </div>
        `;
    }
}

customElements.define("vault-li", VaultLi);