export class CSPMeta extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        // ---
        this.innerHTML = `
            <meta http-equiv="Content-Security-Policy" content="
                default-src 'self'; 
                script-src 'self' https://code.jquery.com/jquery-3.7.0.js https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm; 
                style-src 'self' 'https://fonts.googleapis.com'; 
                font-src 'self' https://fonts.gstatic.com; 
                connect-src 'self'; 
                img-src 'self' data:; 
                frame-src 'none'; 
                object-src 'none'; 
                base-uri 'self'; 
                form-action 'self'; 
                upgrade-insecure-requests; 
                block-all-mixed-content;
            ">
        `;
    }
}
// -- registro il componente nei custom elements
customElements.define('csp-meta', CSPMeta);