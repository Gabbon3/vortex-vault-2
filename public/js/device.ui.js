import { DeviceService } from "../service/device.service.js";
import { date } from "../utils/dateUtils.js";

export class DeviceUI {
    static async init() {
        const inizialized = await DeviceService.init();
        if (inizialized !== true) return;
        // ---
        this.html_devices(DeviceService.devices);
    }
    /**
     * 
     * @param {Array<Object>} devices 
     */
    static html_devices(devices) {
        let html = '';
        for (const device of devices) {
            html += `<device-list-item 
                id="${device.kid}"
                device-name="${device.device_name ?? 'New device *'}"
                user-agent-summary="${device.device_info}"
                lua="${date.format("%j %M %Y at %H:%i", new Date(device.last_seen_at))}"
                current="${device.current ?? false}"
            ></device-list-item>`
        }
        // ---
        document.querySelector('#devices-list').innerHTML = html;
    }
}