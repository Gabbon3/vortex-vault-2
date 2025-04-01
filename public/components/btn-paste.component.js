class BtnPaste extends HTMLElement {
    constructor() {
        super();
        this.target = null;
    }

    connectedCallback() {
        // -- variables
        const target = this.getAttribute('target');
        this.className = `btn t CA ${this.className}`;
        const text = this.textContent;
        this.title = 'Paste';
        // -- html
        this.innerHTML = `${text}<span class="material-symbols-rounded">content_paste</span>`;
        // ---
        this.target = target;
    }
}

customElements.define("btn-paste", BtnPaste);