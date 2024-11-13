class Footer extends HTMLElement {
    constructor() {
        super();
    }
    
    connectedCallback() {
        this.innerHTML = `
        <!-- container dei log -->
        <div id="logs_container"></div>
        <!-- background delle finestre -->
        <div id="bc-finestre"></div>
        `;
    }
}
// -- registro il componente nei custom elements
customElements.define('vortex-footer', Footer);