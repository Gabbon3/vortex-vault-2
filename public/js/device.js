import { finestra } from "../components/main.components.js";
import { DeviceService } from "../service/device.service.js";
import { date } from "../utils/dateUtils.js";

$(document).ready(async () => {
    /**
     * DEVICE NAME
     */
    $('#devices-list').on('keyup', '.device-name', async (e) => {
        const key = e.key;
        const token_id = e.currentTarget.parentElement.parentElement.getAttribute('id');
        // ---
        if (key === 'Enter') {
            finestra.loader(true);
            const device_name = e.currentTarget.value;
            const device = DeviceService.get_device(token_id);
            if (confirm(`Are you sure you want to rename this device into "${device_name}"?`)) {
                await DeviceService.update_device_name(token_id, device_name);
                device.device_name = device_name;
            } else {
                e.currentTarget.value = device.device_name;
            }
        }
        finestra.loader(false);
    })
    /**
     * SYNC
     */
    $('#btn-sync-devices').on('click', async () => {
        finestra.loader(true);
        await DeviceUI.init();
        finestra.loader(false);
    });
});

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
                id="${device.id}"
                device-name="${device.device_name}"
                user-agent-summary="${device.user_agent_summary}"
                lua="${date.format("%j %M %Y at %H:%i", new Date(device.last_used_at))}"
                revoked="${device.is_revoked}"
                current="${device.current ?? false}"
            ></device-list-item>`
        }
        // ---
        document.querySelector('#devices-list').innerHTML = html;
    }
}