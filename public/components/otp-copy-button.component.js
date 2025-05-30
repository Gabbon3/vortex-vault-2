import { Bytes } from "../utils/bytes.js";
import { TOTP } from "../utils/totp.js";

class BtnOtpCopy extends HTMLElement {
    static delegationEvent(event) {
        const btn = event.currentTarget;
        if (!btn.secret) return;
        navigator.clipboard.writeText(btn.code);
        btn.check_animation();
    }

    constructor() {
        super();
        this.span = null;
        this.strong = null;
        this.interval = null;
        this.secret = false;
        this.code = null;
    }

    connectedCallback() {
        // -- variables
        const secret_value = this.getAttribute('secret');
        const formattedSecret = secret_value.toUpperCase().replaceAll(' ', '').trim();
        if (/^[A-Z2-7]+=*$/.test(formattedSecret)) this.secret = Bytes.base32.decode(formattedSecret);
        // ---
        this.title = 'Copy OTP code';
        this.classList.add('CA');
        // -- html
        this.innerHTML = `<span class="material-symbols-rounded">content_copy</span><strong class="mfa ml-2">000 000</strong>`;
        // ---
        this.span = this.querySelector('span');
        this.strong = this.querySelector('strong');
        // --
        this.addEventListener('click', () => {
            if (!this.secret) return;
            navigator.clipboard.writeText(this.code);
            // this.check_animation();
        });
        // -- Avvia l'aggiornamento periodico ogni 30 secondi
        this.startOtpUpdate();
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
        this.code = await TOTP.code(this.secret);
        // Format the OTP code to show with spaces
        const formattedCode = this.code.replace(/(\d{3})(?=\d)/g, "$1 ");
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