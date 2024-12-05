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
        const res = await API.fetch('/auth/token/', {
            method: 'GET'
        });
        if (!res) return null;
        return res;
    }
    /**
     * Rinomina un token
     * @param {string} token_id 
     * @param {string} device_name 
     */
    static async update_device_name(token_id, device_name) {
        const res = await API.fetch('/auth/token/rename', {
            method: 'POST',
            body: { token_id, device_name }
        });
        if (!res) return null;
        return res;
    }
    /**
     * Revoca o meno un dispositivo
     * @param {string} token_id 
     * @param {boolean} revoke 
     */
    static async revoke(token_id, revoke) {
        const res = await API.fetch('/auth/token/revoke', {
            method: 'POST',
            body: { token_id, revoke }
        });
        // ---
        if (!res) return false;
        return true;
    }
    /**
     * Elimina un token
     * @param {string} token_id 
     * @returns 
     */
    static async delete(token_id) {
        const res = await API.fetch(`/auth/token/${token_id}`, {
            method: 'DELETE',
        });
        // ---
        if (!res) return false;
        return true;
    }
    /**
     * Attiva l'autenticazione a due fattori
     * @returns {boolean}
     */
    static async enable_mfa() {
        const res = await API.fetch('/auth/mfa', {
            method: 'POST'
        });
        // ---
        if (!res) return false;
        return res.secret;
    }
    /**
     * Restituisce un device tramite id
     * @param {string} token_id 
     * @returns {Object}
     */
    static get_device(token_id) {
        return this.devices[this.get_index(token_id)];
    }
    /**
     * Restituisce l'index di un device
     * @param {Array<Object>} devices 
     * @param {string} token_id 
     * @returns {string}
     */
    static get_index(token_id, devices = this.devices) {
        return devices.findIndex(device => device.id === token_id);
    }
}

window.DeviceService = DeviceService;