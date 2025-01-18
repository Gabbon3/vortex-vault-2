class BtnHideShowProtectInput extends HTMLElement {
    static id = 0;
    constructor() {
        super();
        this.target = null;
        this.input = null;
        this.icon = null;
    }

    connectedCallback() {
        BtnHideShowProtectInput.id++;
        this.className = 'input-switch flex gap-100 y-center';
        // -- variables
        const target = this.getAttribute('target');
        const checked = this.getAttribute('checked') === 'true';
        const text = this.textContent;
        const id = `btnhspi-${BtnHideShowProtectInput.id}`;
        // -- html
        this.innerHTML = `<input type="checkbox" id="${id}">
        <label class="m-0" for="${id}"></label>
        ${text ? `<span>${text}</span>` : ''}
        <span class="material-symbols-rounded">${checked ? 'visibility' : 'visibility_off'}</span>`;
        // ---
        this.target = document.getElementById(target);
        // --
        this.input = this.querySelector('#' + id);
        this.input.checked = checked;
        // --
        this.icon = this.lastElementChild;
        // --
        this.input.addEventListener('change', this.switch.bind(this));
    }
    /**
     * Copia il testo di un elemento nella clipboard dell'utente
     */
    switch() {
        const elements = this.target.querySelectorAll('input.protected');
        const type = this.input.checked ? 'text' : 'password';
        this.icon.textContent = this.input.checked ? 'visibility' : 'visibility_off';
        // ---
        for (const element of elements) {
            element.type = type;
        }
    }
}

customElements.define("btn-hide-show-protect-input", BtnHideShowProtectInput);