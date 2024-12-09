class PasswordStrengthBar extends HTMLElement {
    static id_ctr = 0;
    constructor() {
        super();
        this.bar_id = null;
        this.bar = null;
    }

    static get observedAttributes() {
        return ['value'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (!this.bar) return;
        if (oldValue !== newValue) {
            this.updateValues();
        }
    }

    updateValues() {
        const value = this.getAttribute('value');
        const { lvl, icon } = this.calc_icon_lvl(value);
        // ---
        this.setAttribute('class', '_' + lvl);
        this.bar.style.width = `${value < 20 ? 20 : value}%`;
        this.bar.innerHTML = `<span class="material-symbols-rounded">${icon}</span>${value}`;
    }

    connectedCallback() {
        this.render();
    }

    calc_icon_lvl(value) {
        // -- livello
        let lvl = 1;
        if (value >= 50 && value < 70) lvl = 2;
        else if (value >= 70 && value < 90) lvl = 3;
        else if (value >= 90 && value <= 100) lvl = 4;
        // -- icona
        let icon = 'report';
        switch (lvl) {
            case 2: icon = 'error'; break;
            case 3: icon = 'check'; break;
            case 4: icon = 'security'; break;
        }
        return { lvl, icon };
    }
    
    render() {
        this.bar_id = `psbc-${PasswordStrengthBar.id_ctr}`; // password strength bar component
        PasswordStrengthBar.id_ctr++;
        this.innerHTML = `<span class="bar" id="${this.bar_id}"></span>`;
        this.bar = document.getElementById(this.bar_id);
        this.updateValues();
    }
}

customElements.define("password-strength-bar", PasswordStrengthBar);