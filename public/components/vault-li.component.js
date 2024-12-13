class VaultLi extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        // -- ottengo gli attributi
        const title = this.getAttribute("title");
        const updated_at = this.getAttribute("updated-at");
        const secure = this.getAttribute("secure") === "true";
        // ---
        this.innerHTML = `
            <div class="simbolo ${!secure ? 'danger' : ''}">
                <span class="material-symbols-rounded">${secure ? 'lock' : 'warning'}</span>
            </div>
            <div class="info">
                <strong>${title}</strong>
                <i>${updated_at}</i>
            </div>
        `;
    }
}

customElements.define("vault-li", VaultLi);