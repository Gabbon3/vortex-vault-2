import { qrcode } from "../utils/qrcode.js";
import { Windows } from "./windows.js";

export class QrCodeDisplay {
    static initialized = false;
    static canvas = null;
    static content = null;
    static default_colors = {
        dark: '#FFFFFF',
        light: '#272222',
    }
    /**
     * Inizializza le variabili della classe
     * @returns {boolean}
     */
    static init() {
        if (this.initialized) return;
        this.canvas = document.getElementById("qrcode-display");
        this.content = document.getElementById("qrcode-display-content");
        // ---
        this.initialized = true;
        return true;
    }
    /**
     * Genera e mostra un qrcode a schermo
     * @param {Object} options 
     * @param {string|Uint8Array} [options.data] - data to show in qrcode
     * @param {number} [options.l] - larghezza e altezza del qrcode in px
     * @param {number} [options.m=2] - margine del qrcode
     * @param {string} [options.light] - colore esadecimale per il bianco
     * @param {string} [options.dark] - colore esadecimale per il nero
     * @param {number} [options.timeout] - tempo di scadenza del qrcode in ms
     * @param {Function} [options.callback] - colore esadecimale per il bianco
     */
    static generate(options) {
        Windows.close();
        // -- calcolo le dimensioni di default in base alla finestra
        const [w, h] = [window.innerWidth, window.innerHeight];
        const l = Math.min((w + h) * 0.25, 250);
        // ---
        qrcode.toCanvas(this.canvas, options.data, {
            width: options.l ?? l,
            margin: options.margin ?? 1,
            color: {
                dark: options.dark ?? this.default_colors.dark,
                light: options.light ?? this.default_colors.light
            }
        });
        this.canvas.style.heigth = options.l ?? l;
        // -- imposto il contenuto del qr code nell'input
        this.content.value = options.data;
        Windows.open('win-qrcode-display');
        // ---
        if (options.callback) options.callback();
        if (!options.timeout) return;
        setTimeout(() => {
            this.canvas.style.height = 0;
        }, options.timeout);
    }
}

window.QrCodeDisplay = QrCodeDisplay;