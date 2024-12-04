import { DeviceService } from "../service/device.service.js";
import { Bytes } from "../utils/bytes.js";
import { date } from "../utils/dateUtils.js";
import { LocalStorage } from "../utils/local.js";
import { Log } from "../utils/log.js";
import { qrcode } from "../utils/qrcode.js";

$(document).ready(async () => {
    await DeviceUI.init();
    /**
     * ENABLE 2FA AUTH
     */
    $('#btn-enable-2fa').on('click', async () => {
        if (!confirm(`Attention! The secret will be shown via QR CODE that you will need to scan.`)) return;
        // ---
        await DeviceUI.enable_2FA_auth();
    });
    /**
     * DEVICE NAME
     */
    $('#devices-list').on('keyup', '.device-name', async (e) => {
        const key = e.key;
        const token_id = e.currentTarget.parentElement.parentElement.getAttribute('id');
        // ---
        if (key === 'Enter') {
            const device_name = e.currentTarget.value;
            const device = DeviceService.get_device(token_id);
            if (confirm(`Are you sure you want to rename this device into "${device_name}"?`)) {
                await DeviceService.update_device_name(token_id, device_name);
                device.device_name = device_name;
            } else {
                e.currentTarget.value = device.device_name;
            }
        }
    })
    /**
     * SYNC
     */
    $('#btn-sync-devices').on('click', () => {
        DeviceUI.init();
    });
});

class DeviceUI {
    static async init() {
        const inizialized = await DeviceService.init();
        if (inizialized !== true) return;
        // ---
        this.html_devices(DeviceService.devices);
    }
    /**
     * 
     * @returns 
     */
    static async enable_2FA_auth() {
        const secret = await DeviceService.enable_2FA_auth();
        if (!secret) return;
        const base32_secret = Bytes.base32.to(Bytes.hex.from(secret));
        const app_name = 'Vortex Vault';
        const username = LocalStorage.get('username-utente');
        // ---
        const canvas = document.querySelector('#qrcode-2fa-secret');
        const uri = `otpauth://totp/${app_name}:${username}?secret=${base32_secret}&issuer=${app_name}`;
        qrcode.toCanvas(canvas, uri, {
            width: 200,
            margin: 2,
            color: {
                dark: "#FFFFFF",
                light: "#272727"
            }
        });
        canvas.style.height = 200;
        // -- copio negli appunti il segreto
        navigator.clipboard.writeText(base32_secret);
        // ---
        Log.summon(0, `MFA enabled`);
        setTimeout(() => {
            Log.summon(1, "Pay attention! The Qr Code will be invalidated in 20 seconds");
            setTimeout(() => {
                canvas.style.height = 0;
            }, 20000);
        }, 1000);
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