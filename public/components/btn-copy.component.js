class BtnCopy extends HTMLElement {
    constructor() {
        super();
        this.span = null;
        this.target = null;
    }

    connectedCallback() {
        // -- variables
        const target = this.getAttribute('target');
        const class_ = this.getAttribute('class') ?? 't';
        const text = this.textContent;
        // -- html
        this.innerHTML = `<button type="button" class="btn ${class_}" title="Copy">
            ${text}
            <span class="material-symbols-rounded">content_copy</span>
        </button>`;
        // ---
        this.target = document.getElementById(target);
        this.span = this.querySelector('span');
        // --
        this.addEventListener('click', this.copy.bind(this));
        this.addEventListener('click', this.check_animation.bind(this));
    }
    /**
     * Copia il testo di un elemento nella clipboard dell'utente
     */
    copy() {
        navigator.clipboard.writeText(this.target.value ?? this.target.textContent);
    }

    check_animation() {
        const current_icon = this.span.textContent;
        if (current_icon === 'check') return;
        // ---
        this.span.textContent = 'check';
        setTimeout(() => {
            this.span.textContent = current_icon;
        }, 1000);
    }
}

customElements.define("btn-copy", BtnCopy);