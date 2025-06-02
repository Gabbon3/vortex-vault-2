import { Log } from "../../utils/log.js";
import { DeviceService } from "../../service/device.service.js";
import { Windows } from "../../utils/windows.js";
import { Cripto } from "../../secure/cripto.js";

class DeviceListItem extends HTMLElement {
    constructor() {
        super();
        this.deviceId = null;
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

    async render() {
        // -- imposto livello e messaggio in base agli attributi
        const deviceId = this.getAttribute('id');
        this.deviceId = deviceId;
        const device_name = this.getAttribute('device-name');
        const user_agent_summary = this.getAttribute('user-agent-summary');
        const lua = this.getAttribute('lua'); // last used at
        const revoked = this.getAttribute('revoked');
        const current = JSON.parse(this.getAttribute('current'));
        // ---
        if (current) this.classList.add('current');
        // -- imposto la struttura HTML interna del log
        this.innerHTML = `
            <span class="token-id">
                <span class="material-symbols-rounded">fingerprint</span>
                <i>${(await Cripto.hash(deviceId, { encoding: 'base62' })).match(/.{1,16}/g)[0]}</i>
            </span>
            <div class="flex gap-50 d-row">
                <input type="text" class="input-text device-name select-all-onclick" title="Device name" value="${device_name}">
                <!-- <button 
                    title="Revoke or not this device"
                    class="btn ${revoked === 'true' ? 'danger' : 'primary'} revoke-device"
                    ${current ? 'disabled' : ''}>
                    <span class="material-symbols-rounded">${revoked === 'true' ? 'close' : 'check'}</span>
                </button> -->
                <button class="btn danger device-delete" title="Delete this device" ${current ? 'disabled' : ''}>
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
        // this.querySelector('.revoke-device').addEventListener('click', this.toggle_revoked.bind(this));
        // -- pulsante cancella
        this.querySelector('.device-delete').addEventListener('click', this.delete_device.bind(this));
        // -- rinomina del dispositivo
        this.querySelector('.device-name').addEventListener('keydown', (e) => {
            this.renameDevice(e);
        });
    }
    /**
     * Revoke a token
     */
    async toggle_revoked() {
        const revoked = this.getAttribute('revoked') === 'true';
        const token_id = this.getAttribute('id');
        const device_name = this.getAttribute('device-name');
        // -- business
        const done = await DeviceService.revoke(token_id, !revoked);
        if (!done) return;
        // ---
        Log.summon(0, `${device_name} ${revoked ? 'un' : ''} revoked`);
        this.setAttribute('revoked', revoked ? 'false' : 'true');
    }
    /**
     * Delete a device from 
     * @returns 
     */
    async delete_device() {
        if (!confirm('Are you sure you want to delete this device?')) return;
        // ---
        const token_id = this.getAttribute('id');
        // ---
        Windows.loader(true);
        const deleted = await DeviceService.delete(token_id);
        Windows.loader(false);
        if (!deleted) return;
        this.remove();
        Log.summon(0, "Device deleted successfully");
    }
    /**
     * @param {Event} e 
     */
    async renameDevice(e) {
        const key = e.key;
        // ---
        if (key === 'Enter') {
            Windows.loader(true);
            const deviceName = e.currentTarget.value;
            const device = DeviceService.get_device(this.deviceId);
            if (confirm(`Are you sure you want to rename this device into "${deviceName}"?`)) {
                await DeviceService.update_device_name(this.deviceId, deviceName);
                device.device_name = deviceName;
            } else {
                e.currentTarget.value = device.device_name;
            }
        }
        Windows.loader(false);
    }
}

customElements.define("device-list-item", DeviceListItem);