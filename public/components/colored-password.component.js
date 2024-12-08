class ColoredPassword extends HTMLElement {
    constructor() {
        super();
    }
    /**
     * Esegue il coloramento del testo dell'elemento corrente
     * @param {Event} event 
     */
    highlight(event) {
        const el = event.currentTarget;
        const text = el.textContent;
        el.innerHTML = this.colorize_text(text);
        this.move_caret_to_end(el);
    }
    /**
     * Restituisce il testo suddiviso per tipo con gia l'html inserito
     * @param {string} text 
     */
    colorize_text(text) {
        const groups = text.match(/([A-Z]+)|([a-z]+)|([0-9]+)|([^a-zA-Z0-9]+)/g) || [];
        return groups.map(group => {
            if (/[a-z]/.test(group)) return `<i class="az">${group}</i>`;
            else if (/[A-Z]/.test(group)) return `<i class="AZ">${group}</i>`;
            else if (/[0-9]/.test(group)) return `<i class="_09">${group}</i>`;
            else return `<i class="_s">${group}</i>`;
        }).join('');
    }
    /**
     * Sposta il cursore al fondo
     * @param {HTMLElement} el 
     */
    move_caret_to_end(el) {
        const range = document.createRange();
        const selection = window.getSelection();
        range.setStart(el, el.childNodes.length);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }
    
    connectedCallback() {
        const id = this.getAttribute('id');
        this.classList.add('input-text');
        this.setAttribute("contenteditable", true);
        // -- events
        document.getElementById(id).addEventListener('input', this.highlight);
    }

    disconnectedCallback() {
        // -- rimuovo il listener se l'elemento viene rimosso
        this.removeEventListener('input', this.highlight);
    }
}

customElements.define("colored-password", ColoredPassword);