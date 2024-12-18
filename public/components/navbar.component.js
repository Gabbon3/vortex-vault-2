import { LocalStorage } from "../utils/local.js";

export class VortexNavbar extends HTMLElement {
    constructor() {
        super();
    }

    static sudo_indicator = null;

    static async sudo_indicator_init() {
        const sudo_expire = await LocalStorage.get('sudo-expire');
        if (!sudo_expire || new Date() > sudo_expire) return;
        // ---
        const diff = sudo_expire.getTime() - Date.now();
        VortexNavbar.sudo_indicator.setAttribute('class', 'sudo');
        setTimeout(() => {
            VortexNavbar.sudo_indicator.setAttribute('class', 'base');
        }, diff);
    }
    
    connectedCallback() {
        const path = window.location.pathname;
        // ---
        this.innerHTML = `
            <nav class="navbar">
                ${path === '/vault' ? `<a class="open" data-target-open="win-settings">
                    <span class="material-symbols-rounded">settings</span>
                    Settings
                </a>` : ''}
                ${path === '/vault' ? `<a class="open" data-target-open="win-devices">
                    <span class="material-symbols-rounded">token</span>
                    Devices
                </a>` : ''}
                ${path === '/vault' ? `<a class="open" data-target-open="win-backups">
                    <span class="material-symbols-rounded">cloud</span>
                    Backup
                </a>` : ''}
                ${path === '/vault' ? `<a class="open" data-target-open="win-psw-generator">
                    <span class="material-symbols-rounded">key_vertical</span>
                    Generator
                </a>` : ''}
                ${path !== '/vault' ? `<a href="/vault"'>
                    <span class="material-symbols-rounded">lock</span>
                    Vault
                </a>` : ''}
                ${path !== '/signin' ? `<a href="/signin"'>
                    <span class="material-symbols-rounded">login</span>
                    Sign In
                </a>` : ''}
                ${path !== '/signup' && path !== '/vault' ? `<a href="/signup"'>
                    <span class="material-symbols-rounded">person_add</span>
                    Sign Up
                </a>` : ''}
            </nav>
            <span id="sudo-indicator" class="base" title="Session status">
                <span class="material-symbols-rounded">vpn_key</span>
            </span>
        `;
        VortexNavbar.sudo_indicator = document.getElementById('sudo-indicator');
        VortexNavbar.sudo_indicator_init();
    }
}
// -- registro il componente nei custom elements
customElements.define('vortex-navbar', VortexNavbar);