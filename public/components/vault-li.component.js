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
        /**
         * vault: 0 verde/rosso
         * note: 1 azzurro
         * card: 2 giallo
         * chiavi pubbliche: 3 viola
         */
        let icon = '';
        let color = '';
        switch (st) {
            case '0':
                icon = secure ? 'key_vertical' : 'warning';
                color = secure ? 'orange' : 'red';
                break;
            case '1':
                icon = 'sticky_note_2';
                color = 'lightblue';
                break;
            case '2':
                icon = 'credit_card';
                color = 'yellow';
                break;
            case '3':
                icon = 'key_vertical';
                color = 'purple';
                break;
        }
        if (st === '3') {
            icon = `<div class="flex">
                <span class="material-symbols-rounded trans rotate _180">key_vertical</span>
                <span class="material-symbols-rounded" style="margin-left: -15px;">key_vertical</span>
            </div>`;
        } else {
            icon = `<span class="material-symbols-rounded">${icon}</span>`;
        }
        // ---
        this.innerHTML = `
            <div class="simbolo ${color}">
                ${icon}
            </div>
            <div class="info">
                <strong>${title}</strong>
                <i>${updated_at}</i>
            </div>
        `;
    }
}

customElements.define("vault-li", VaultLi);