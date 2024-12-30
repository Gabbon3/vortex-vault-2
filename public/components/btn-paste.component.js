class BtnPaste extends HTMLElement {
    constructor() {
        super();
        this.span = null;
        this.target = null;
    }

    connectedCallback() {
        // -- variables
        const target = this.getAttribute('target');
        // -- html
        this.innerHTML = `<button type="button" class="btn t" title="Paste">
            <span class="material-symbols-rounded">content_paste</span>
        </button>`;
        // ---
        this.target = document.getElementById(target);
        this.span = this.querySelector('span');
        // --
        this.addEventListener('click', this.paste.bind(this));
        this.addEventListener('click', this.check_animation.bind(this));
    }
    /**
     * Incolla il testo della clipboard nell'elemento target
     */
    paste() {
        navigator.clipboard.readText().then((text) => {
            this.target.tagName === 'INPUT' || this.target.tagName === 'TEXTAREA' ?
                this.target.value = text :
                this.target.textContent = text;
            // --- simulo l'evento
            const keyupevent = new KeyboardEvent('input', {
                key: '',
                bubbles: true,
                cancelable: true,
            });
            // ---
            this.target.dispatchEvent(keyupevent);
        }).catch((error) => { console.warn(error) });
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

customElements.define("btn-paste", BtnPaste);