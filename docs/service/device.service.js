import { API } from "../utils/api.js";

export class DeviceService {
    static devices = null;
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
        const res = await API.fetch('/public-key/', {
            method: 'GET'
        });
        if (!res) return null;
        return res;
    }
    /**
     * Rinomina un token
     * @param {string} sid 
     * @param {string} newName 
     */
    static async update_device_name(sid, newName) {
        const res = await API.fetch(`/public-key/${sid}/name`, {
            method: 'PATCH',
            body: { sid: sid, name: newName }
        });
        if (!res) return null;
        return res;
    }
    /**
     * Elimina un token
     * @param {string} sid 
     * @returns {boolean}
     */
    static async delete(sid) {
        const res = await API.fetch(`/public-key/${sid}`, {
            method: 'DELETE',
        });
        // ---
        if (!res) return false;
        return true;
    }
    /**
     * Restituisce un device tramite id
     * @param {string} sid 
     * @returns {Object}
     */
    static get_device(sid) {
        return this.devices[this.get_index(sid)];
    }
    /**
     * Restituisce l'index di un device
     * @param {Array<Object>} devices 
     * @param {string} sid 
     * @returns {string}
     */
    static get_index(sid, devices = this.devices) {
        return devices.findIndex(device => device.sid === sid);
    }
}

window.DeviceService = DeviceService;