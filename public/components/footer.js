class Footer extends HTMLElement {
    constructor() {
        super();
    }
    
    connectedCallback() {
        this.innerHTML = `
            <footer>
                Footer
            </footer>
        `;
    }
}
// -- registro il componente nei custom elements
customElements.define('vortex-footer', Footer);