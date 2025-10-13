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
     * @param {string} id 
     * @param {string} newName 
     */
    static async update_device_name(id, newName) {
        const res = await API.fetch(`/public-key/${id}/name`, {
            method: 'PATCH',
            body: { id: id, name: newName }
        });
        if (!res) return null;
        return res;
    }
    /**
     * Elimina un token
     * @param {string} id 
     * @returns {boolean}
     */
    static async delete(id) {
        const res = await API.fetch(`/public-key/${id}`, {
            method: 'DELETE',
        });
        // ---
        if (!res) return false;
        return true;
    }
    /**
     * Restituisce un device tramite id
     * @param {string} id 
     * @returns {Object}
     */
    static get_device(id) {
        return this.devices[this.get_index(id)];
    }
    /**
     * Restituisce l'index di un device
     * @param {Array<Object>} devices 
     * @param {string} id 
     * @returns {string}
     */
    static get_index(id, devices = this.devices) {
        return devices.findIndex(device => device.id === id);
    }
}

window.DeviceService = DeviceService;