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
        const icon = st === '0' ? secure ? 'lock' : 'warning' : st === '1' ? 'draft' : 'credit_card';
        // ---
        this.innerHTML = `
            <div class="simbolo ${!secure && st === '0' ? 'danger' : ''}">
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