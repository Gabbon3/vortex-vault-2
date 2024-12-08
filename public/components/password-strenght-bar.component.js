class PasswordStrengthBar extends HTMLElement {
    constructor() {
        super();
    }

    static get observedAttributes() {
        return ['value'];
    }

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
        }
    }
    
    render() {
        const id = this.getAttribute('id');
        // 0 -- 100
        const value = this.getAttribute('value');
        // -- livello
        let lvl = 1;
        if (value >= 40 && value < 60) lvl = 2;
        else if (value >= 60 && value < 80) lvl = 3;
        else if (value >= 80 && value <= 100) lvl = 4;
        // --
        this.setAttribute('class', '_' + lvl);
        // -- icona
        let icon = 'report';
        switch (lvl) {
            case 2: icon = 'error'; break;
            case 3: icon = 'check'; break;
            case 4: icon = 'security'; break;
        }
        // ---
        this.innerHTML = `<span class="bar" style="width: ${value < 20 ? 20 : value}%">
            <span class="material-symbols-rounded">${icon}</span>
            ${value}
            </span>`
    }
}

customElements.define("password-strength-bar", PasswordStrengthBar);