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
            <img src="./img/vortex_vault_logo.png" class="logo">
            <nav class="navbar">
                ${path === '/vault' ? `<a class="open blue" data-target-open="win-settings" title="Settings">
                    <span class="material-symbols-rounded">settings</span>
                    <i>Settings</i>
                </a>` : ''}
                ${path === '/vault' ? `<a class="open purple" data-target-open="win-devices" title="Devices">
                    <span class="material-symbols-rounded">token</span>
                    <i>Devices</i>
                </a>` : ''}
                ${path === '/vault' ? `<a class="open yellow" data-target-open="win-backups" title="Backup">
                    <span class="material-symbols-rounded">cloud</span>
                    <i>Backup</i>
                </a>` : ''}
                ${path === '/vault' ? `<a class="open red" data-target-open="win-passkey" title="Passkey">
                    <span class="material-symbols-rounded">passkey</span>
                    <i>Passkey</i>
                </a>` : ''}
                ${path === '/vault' ? `<a class="open" data-target-open="win-psw-generator" title="Password Generator">
                    <span class="material-symbols-rounded">key_vertical</span>
                    <i>Generator</i>
                </a>` : ''}

                ${path !== '/vault' ? `<a href="/vault"' title="Vault" class="orange">
                    <span class="material-symbols-rounded">encrypted</span>
                    <i>Vault</i>
                </a>` : ''}
                
                ${path === '/signin' ? `<a class="open yellow" data-target-open="win-device-recovery" title="Device Recovery">
                    <span class="material-symbols-rounded">mobile_friendly</span>
                    <i>Device Recovery</i>
                </a>` : ''}
                ${path !== '/signin' ? `<a href="/signin"' title="Sign In" class="mint">
                    <span class="material-symbols-rounded">login</span>
                    <i>Sign In</i>
                </a>` : ''}

                ${path !== '/signup' && path !== '/vault' ? `<a href="/signup"' title="Sign Up" class="mint">
                    <span class="material-symbols-rounded">person_add</span>
                    <i>Sign Up</i>
                </a>` : ''}
            </nav>
        `;
        VortexNavbar.sudo_indicator = document.getElementById('sudo-indicator');
        // VortexNavbar.sudo_indicator_init();
    }
}
// -- registro il componente nei custom elements
customElements.define('vortex-navbar', VortexNavbar);