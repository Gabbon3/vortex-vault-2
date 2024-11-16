import { Log } from "../utils/log.js";
import { DeviceBusiness } from "../business/device.business.js";

class DeviceListItem extends HTMLElement {
    constructor() {
        super();
    }

    static get observedAttributes() {
        return ['id', 'device-name', 'user-agent-summary', 'lua', 'revoked'];
    }

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    render() {
        // -- imposto livello e messaggio in base agli attributi
        const token_id = this.getAttribute('id');
        const device_name = this.getAttribute('device-name');
        const user_agent_summary = this.getAttribute('user-agent-summary');
        const lua = this.getAttribute('lua'); // last used at
        const revoked = this.getAttribute('revoked');
        // -- imposto la struttura HTML interna del log
        this.innerHTML = `
            <span class="token-id">
                <span class="material-symbols-rounded">tag</span>
                <i>${token_id}</i>
            </span>
            <div class="flex gap-50 d-row">
                <input type="text" class="input-text device-name" title="Device name" value="${device_name}">
                <button 
                    title="Revoke or not this device"
                    class="btn ${revoked === 'true' ? 'danger' : 'primario'} revoke-device">
                    <span class="material-symbols-rounded">${revoked === 'true' ? 'close' : 'check'}</span>
                </button>
                <button class="btn danger device-delete" title="Delete this device">
                    <span class="material-symbols-rounded">delete</span>
                </button>
            </div>
            <div class="info">
                <input type="text" class="input-text" title="User Agent" value="${user_agent_summary}" readonly>
                <input type="text" class="input-text" title="Last used at" value="${lua}" readonly>
            </div>
        `;
        // -- EVENTI
        // -- pulsante revoca
        this.querySelector('.revoke-device').addEventListener('click', this.toggle_revoked.bind(this));
        // -- pulsante cancella
        this.querySelector('.device-delete').addEventListener('click', this.delete_device.bind(this));
    }

    toggle_revoked() {
        const revoked = this.getAttribute('revoked') === 'true';
        const token_id = this.getAttribute('id');
        const device_name = this.getAttribute('device-name');
        Log.summon(0, `${device_name} ${revoked ? 'un' : ''} revoked`);
        // -- business
        const done = DeviceBusiness.revoke(token_id, !revoked);
        if (!done) return;
        // ---
        this.setAttribute('revoked', revoked ? 'false' : 'true');
    }

    delete_device() {
        // -- gestione cancellazione del device
        //...
    }
}

customElements.define("device-list-item", DeviceListItem);