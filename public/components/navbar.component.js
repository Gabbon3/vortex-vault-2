import { LocalStorage } from "../utils/local.js";

export class VortexNavbar extends HTMLElement {
    constructor() {
        super();
    }
    
    connectedCallback() {
        const path = window.location.pathname;
        // ---
        // <img src="./img/vortex_vault_logo.png" class="logo">
        this.innerHTML = `
            <nav class="navbar">
                ${path ? `<a class="open blue" data-target-open="win-settings" title="Tools">
                    <span class="material-symbols-rounded">handyman</span>
                    <i>Tools</i>
                </a>` : ''}
                ${path === '/vault' ? `<a class="open purple" data-target-open="win-devices" title="Devices">
                    <span class="material-symbols-rounded">token</span>
                    <i>Devices</i>
                </a>` : ''}
                ${path === '/vault' ? `<a class="open red" data-target-open="win-passkey" title="Passkey">
                    <span class="material-symbols-rounded">passkey</span>
                    <i>Passkey</i>
                </a>` : ''}
                ${path === '/vault' ? `<a class="open yellow" data-target-open="win-backups" title="Backup">
                    <span class="material-symbols-rounded">cloud</span>
                    <i>Backup</i>
                </a>` : ''}
                


                ${path === '/vault' ? `<a class="open olivegreen" data-target-open="win-psw-generator" title="Password Generator">
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

                ${path === '/signin' ? `<a title="Sign-in with Passkey" id="signin-passkey" class="red">
                    <span class="material-symbols-rounded">passkey</span>
                    <i>Sign-in with Passkey</i>
                </a>` : ''}
                ${path !== '/signup' && path !== '/vault' ? `<a href="/signup"' title="Sign Up" class="mint">
                    <span class="material-symbols-rounded">person_add</span>
                    <i>Sign Up</i>
                </a>` : ''}
            </nav>
            <img src="./img/vortex_vault_logo.png" class="logo">
        `;
    }
}
/*
${path ? `<a class="open orange" data-target-open="win-totp" title="Time-Based One-Time Password">
    <span class="material-symbols-rounded">phonelink_lock</span>
    <i>TOTP</i>
</a>` : ''}
*/
// -- registro il componente nei custom elements
customElements.define('vortex-navbar', VortexNavbar);