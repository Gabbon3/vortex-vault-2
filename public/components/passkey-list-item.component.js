import { Log } from "../utils/log.js";
import { Windows } from "../utils/windows.js";
import { Cripto } from "../secure/cripto.js";
import { PasskeyService } from "../service/passkey.public.service.js";
import { date } from "../utils/dateUtils.js";

class PasskeyListItem extends HTMLElement {
    constructor() {
        super();
        this.id = null;
    }

    connectedCallback() {
        this.render();
    }

    async render() {
        const id = this.getAttribute('passkey-id');
        this.id = id;
        const name = this.getAttribute('name');
        const updated_at = this.getAttribute('updated-at');
        const created_at = this.getAttribute('created-at');
        // ---
        this.innerHTML = `
            <span class="token-id">
                <span class="material-symbols-rounded">fingerprint</span>
                <i>${(await Cripto.hash(id, { encoding: 'base62' })).match(/.{1,16}/g)[0]}</i>
            </span>
            <div class="flex gap-50 y-center d-row">
                <input type="text" class="input-text passkey-name" title="Passkey name" value="${name}">
                <button class="btn danger passkey-delete" title="Delete this passkey">
                    <span class="material-symbols-rounded">delete</span>
                </button>
            </div>
            <div class="flex gap-50 wrap">
                <label class="isle bg-1 fg-1 icon m-0" title="Created Date">
                    <span class="material-symbols-rounded">calendar_add_on</span>
                    <span id="update-created-date">${date.format('%j %M %y at %H:%i', new Date(created_at))}</span>
                </label>
                <label class="isle bg-1 fg-1 icon m-0" title="Last Update Date">
                    <span class="material-symbols-rounded">edit_calendar</span>
                    <span id="update-last-modified-date">${date.format('%j %M %y at %H:%i', new Date(updated_at))}</span>
                </label>
            </div>
        `;
        // -- EVENTI
        this.querySelector('.passkey-name').addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                this.rename_passkey(event);
            }
        });
        // -- pulsante cancella
        this.querySelector('.passkey-delete').addEventListener('click', this.delete_passkey.bind(this));
    }
    /**
     * Rinomina una passkey
     */
    async rename_passkey(event) {
        if (event.key !== 'Enter') return;
        const name = event.currentTarget.value;
        if (!confirm('Are you sure you want to rename this passkey into ' + name + '?')) return;
        // ---
        Windows.loader(true);
        const updated = await PasskeyService.rename(this.id, name);
        Windows.loader(false);
        if (!updated) return;
        this.querySelector('.passkey-name').value = name;
        Log.summon(0, "Passkey renamed in " + name);
    }
    /**
     * Delete a device from 
     * @returns 
     */
    async delete_passkey() {
        if (!confirm('Are you sure you want to delete this passkey?')) return;
        // ---
        Windows.loader(true);
        const deleted = await PasskeyService.delete(this.id);
        Windows.loader(false);
        if (!deleted) return;
        this.remove();
        Log.summon(0, "Device deleted successfully");
    }
}

customElements.define("passkey-list-item", PasskeyListItem);