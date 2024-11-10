class Navbar extends HTMLElement {
    constructor() {
        super();
    }
    
    connectedCallback() {
        const path = window.location.pathname;
        // ---
        this.innerHTML = `
            <nav class="navbar">
                <a ${path === '/vortexvault' ? '' : 'href="/vortexvault"'}>
                    <span class="material-symbols-rounded">lock</span>
                    Vault
                </a>
                <a ${path === '/accedi' ? '' : 'href="/accedi"'}>
                    <span class="material-symbols-rounded">login</span>
                    Accedi
                </a>
                <a ${path === '/registrati' ? '' : 'href="/registrati"'}>
                    <span class="material-symbols-rounded">person_add</span>
                    Registrati
                </a>
            </nav>
        `;
    }
}
// -- registro il componente nei custom elements
customElements.define('vortex-navbar', Navbar);