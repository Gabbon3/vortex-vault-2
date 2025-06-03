// import { LocalStorage } from "../utils/local.js";

export class VortexNavbar extends HTMLElement {
    constructor() {
        super();
    }
    
    connectedCallback() {
        // ---
        // <img src="./img/vortex_vault_logo.png" class="logo">
        /**
         * Chat rimossa:
        ${path !== '/chat' ? `<a href="/vortex-vault-2/chat.html"' title="Chat">
            <span class="material-symbols-rounded">sms</span>
            <i>Chat</i>
        </a>` : ''}
         * Recupero dispositivo rimosso:
        ${path === '/signin' ? `<a class="open yellow" data-target-open="win-device-recovery" title="Device Recovery">
            <span class="material-symbols-rounded">mobile_friendly</span>
            <i>Device Recovery</i>
        </a>` : ''}
         */
        this.innerHTML = `
        ${true ? `<a class="open blue" data-target-open="win-settings" title="Tools">
            <span class="material-symbols-rounded">handyman</span>
            <i>Tools</i>
        </a>` : ''}
        ${this.checkPath('/vault', true) ? `<a class="open purple" data-target-open="win-devices" title="Devices">
            <span class="material-symbols-rounded">devices</span>
            <i>Devices</i>
        </a>` : ''}
        ${this.checkPath('/vault', true) ? `<a class="open red" data-target-open="win-passkey" title="Passkey">
            <span class="material-symbols-rounded">passkey</span>
            <i>Passkey</i>
        </a>` : ''}
        ${this.checkPath('/vault', true) ? `<a class="open yellow" data-target-open="win-backups" title="Backup">
            <span class="material-symbols-rounded">cloud</span>
            <i>Backup</i>
        </a>` : ''}

        ${this.checkPath('/vault', true) ? `<a class="open olivegreen" data-target-open="win-psw-generator" title="Password Generator">
            <span class="material-symbols-rounded">key_vertical</span>
            <i>Generator</i>
        </a>` : ''}

        ${this.checkPath('/vault', false) ? `<a href="/vortex-vault-2/vault.html" title="Vault">
            <span class="material-symbols-rounded">encrypted</span>
            <i>Vault</i>
        </a>` : ''}
            
        ${this.checkPath('/signin', false) ? `<a href="/vortex-vault-2/signin.html" title="Sign In" class="mint last">
            <span class="material-symbols-rounded">login</span>
            <i>Sign In</i>
        </a>` : ''}

        ${this.checkPath('/signin', true) ? `<a title="Sign-in with Passkey" id="signin-passkey" class="red">
            <span class="material-symbols-rounded">passkey</span>
            <i>Sign-in with Passkey</i>
        </a>` : ''}
        ${this.checkPath('/signin', true) ? `<a href="/vortex-vault-2/signup.html" title="Sign Up" class="mint last">
            <span class="material-symbols-rounded">person_add</span>
            <i>Sign Up</i>
        </a>` : ''}
        `;
    }

    checkPath(path, same = true) {
        return same ?
            window.location.pathname === `${"/vortex-vault-2" + path + ".html"}`
            :
            window.location.pathname !== `${"/vortex-vault-2" + path + ".html"}`;
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