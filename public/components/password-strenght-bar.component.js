import { ptg } from "../utils/passwordtester.js";

class PasswordStrengthBar extends HTMLElement {
    static id_ctr = 0;
    constructor() {
        super();
        this.bar_id = null;
        this.bar = null;
        this.input = null;
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
        this.bar.setAttribute('class', 'bar _' + lvl);
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
        // -- psbc = password strength bar component
        this.bar_id = `psbc-${PasswordStrengthBar.id_ctr}`;
        PasswordStrengthBar.id_ctr++;
        this.innerHTML = `<span class="bar" id="${this.bar_id}"></span>`;
        this.bar = document.getElementById(this.bar_id);
        this.updateValues();
        // -- input collegato
        const id_input = this.getAttribute('input-id') ?? null;
        if (!id_input) return;
        this.input = document.getElementById(id_input);
        // -- evento collegato dell'input
        this.input.addEventListener('keyup', this.input_listener.bind(this));
    }
    /**
     * funzione che si attiva se this.input esegue keyup
     * @param {Event} e 
     */
    input_listener(e) {
        const password = e.currentTarget.textContent || e.currentTarget.value;
        if (password.length < 1) return;
        const test = ptg.test(password);
        this.setAttribute('value', test);
    }
}

customElements.define("password-strength-bar", PasswordStrengthBar);