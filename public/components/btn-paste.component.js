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
        this.innerHTML = `<span class="material-symbols-rounded">content_paste</span>${text}`;
        // ---
        this.target = target;
    }
}

customElements.define("btn-paste", BtnPaste);