import { API } from "../utils/api.js";

export class DeviceService {
    static devices = null;
    /*
    example response from /auth/token/
    [
        {
            "id": "3Hs3BW3wiWr3sA-uudlOyd-1W6J-zAoJ66UkolD8s",
            "user_id": 1,
            "device_name": "*",
            "user_agent_hash": "7675d59b5e84e0a878ee6f0a97f9056f",
            "user_agent_summary": "Chrome-130-Windows-10",
            "ip_address": "::1",
            "iat": "2024-11-15T16:32:24.000Z",
            "last_used_at": "2024-11-15T16:32:24.000Z",
            "is_revoked": false
        },
        { ... },
        ...
    ]
    */
    static async init() {
        this.devices = await this.get_all();
        if (!this.devices) return false;
        return true;
    }
    /**
     * Ottieni la lista dei refresh token associati all'utente
     * @returns {Array<Object>} un array contenente la lista dei refresh token associati
     */
    static async get_all() {
        const res = await API.fetch('/shiv/session', {
            method: 'GET'
        });
        if (!res) return null;
        return res;
    }
    /**
     * Rinomina un token
     * @param {string} kid 
     * @param {string} newName 
     */
    static async update_device_name(kid, newName) {
        const res = await API.fetch(`/shiv/session/${kid}/name`, {
            method: 'PATCH',
            body: { kid: kid, name: newName }
        });
        if (!res) return null;
        return res;
    }
    /**
     * Elimina un token
     * @param {string} kid 
     * @returns {boolean}
     */
    static async delete(kid) {
        const res = await API.fetch(`/shiv/session/${kid}`, {
            method: 'DELETE',
        });
        // ---
        if (!res) return false;
        return true;
    }
    /**
     * Restituisce un device tramite id
     * @param {string} kid 
     * @returns {Object}
     */
    static get_device(kid) {
        return this.devices[this.get_index(kid)];
    }
    /**
     * Restituisce l'index di un device
     * @param {Array<Object>} devices 
     * @param {string} kid 
     * @returns {string}
     */
    static get_index(kid, devices = this.devices) {
        return devices.findIndex(device => device.kid === kid);
    }
}

window.DeviceService = DeviceService;