import { Bytes } from "../utils/bytes.js";
import { Log } from "../utils/log.js";
import { TOTP } from "../utils/totp.js";

class BtnOtpCopy extends HTMLElement {
    constructor() {
        super();
        this.span = null;
        this.strong = null;
        this.interval = null;
        this.secret = false;
    }

    connectedCallback() {
        // -- variables
        const secret_value = this.getAttribute('secret');
        if (/^[A-Z2-7]+=*$/.test(secret_value)) this.secret = Bytes.base32.decode(secret_value);
        // ---
        this.title = 'Copy OTP code';
        // -- html
        this.innerHTML = `<span class="material-symbols-rounded">content_copy</span>
            <strong class="mfa ml-2">000 000</strong>`;
        // ---
        this.span = this.querySelector('span');
        this.strong = this.querySelector('strong');
        // --
        this.addEventListener('click', this.copy.bind(this));
        // -- Avvia l'aggiornamento periodico ogni 30 secondi
        this.startOtpUpdate();
    }
    /**
     * Copia il testo di un elemento nella clipboard dell'utente
     */
    async copy() {
        if (!this.secret) return;
        const code = await TOTP.code(this.secret);
        Log.summon(3, code);
        navigator.clipboard.writeText(code);
        this.check_animation();
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

    /**
     * Avvia un intervallo che aggiorna il codice OTP sincronizzato ai 30 secondi
     */
    startOtpUpdate() {
        if (!this.secret) return;
        // ---
        this.updateOtpCode(); // Chiama immediatamente la funzione per mostrare il codice iniziale
        this.syncWithTime();
    }

    /**
     * Sincronizza l'aggiornamento con il tempo (ogni 30 secondi)
     */
    syncWithTime() {
        const currentTime = Math.floor(Date.now() / 1000);
        const secondsUntilNextInterval = 30 - (currentTime % 30); // Calcola i secondi rimanenti fino ai prossimi 30 secondi
        // Imposta il timeout per il prossimo aggiornamento
        setTimeout(() => {
            this.updateOtpCode(); // Chiama l'aggiornamento del codice OTP
            this.interval = setInterval(() => {
                this.updateOtpCode(); // Chiama l'aggiornamento ogni 30 secondi
            }, 30000); // Ogni 30 secondi
        }, secondsUntilNextInterval * 1000); // Aspetta fino al prossimo intervallo di 30 secondi
    }

    /**
     * Aggiorna il codice OTP visibile sul pulsante
     */
    async updateOtpCode() {
        const code = await TOTP.code(this.secret);
        // Format the OTP code to show with spaces
        const formattedCode = code.replace(/(\d{3})(?=\d)/g, "$1 ");
        this.strong.textContent = formattedCode;
    }

    disconnectedCallback() {
        // Pulisci l'intervallo quando l'elemento viene rimosso dal DOM
        if (this.interval) {
            clearInterval(this.interval);
        }
    }
}

customElements.define("otp-copy-button", BtnOtpCopy);