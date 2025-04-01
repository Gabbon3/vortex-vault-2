export class BtnCopy extends HTMLElement {
    constructor() {
        super();
        this.target = null;
    }

    connectedCallback() {
        // -- variables
        const target = this.getAttribute('target');
        this.className = `btn t CA ${this.className}`;
        const text = this.textContent;
        this.title = 'Copy';
        // -- html
        this.innerHTML = `${text}<span class="material-symbols-rounded">content_copy</span>`;
        // ---
        this.target = target;
    }

    static callbacks = {
        /**
         * COPIA CONTENUTO ELIMINANDO GLI SPAZI
         * @param {string} t
         */
        'rmSpace': (t) => {
            return t.replaceAll(' ', '').trim();
        }
    }
}

customElements.define("btn-copy", BtnCopy);