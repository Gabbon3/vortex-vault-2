import { DeviceService } from "../service/device.service.js";
import { date } from "../utils/dateUtils.js";
import { Windows } from "../utils/windows.js";

document.addEventListener("DOMContentLoaded", async () => {
    const syncButton = document.querySelector("#btn-sync-devices");
    if (syncButton) {
        syncButton.addEventListener("click", async () => {
            Windows.loader(true);
            await DeviceUI.init();
            Windows.loader(false);
        });
    }
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
        let html = "";
        for (const device of devices) {
            html += `<device-list-item 
                id="${device.sid}"
                device-name="${
                    device.device_name ??
                    "Clicca qui per rinominare il dispositivo"
                }"
                user-agent-summary="${device.device_info}"
                lua="${
                    device.last_seen_at
                        ? date.format(
                              "%j %M %Y - %H:%i",
                              new Date(device.last_seen_at)
                          )
                        : "Mai usato"
                }"
                current="${device.current ?? false}"
            ></device-list-item>`;
        }
        // ---
        document.querySelector("#devices-list").innerHTML = html;
    }
}
