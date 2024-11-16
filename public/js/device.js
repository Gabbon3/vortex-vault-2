import { DeviceBusiness } from "../business/device.business.js";
import { Bytes } from "../utils/bytes.js";
import { date } from "../utils/dateUtils.js";
import { LocalStorage } from "../utils/local.js";
import { Log } from "../utils/log.js";

$(document).ready(async () => {
    await DeviceUI.init();
    /**
     * ENABLE 2FA AUTH
     */
    $('#btn-enable-2fa').on('click', async () => {
        if (!confirm(`Attenzione! Verrà mostrato il segreto tramite QR CODE che dovrai scansionare.`)) return;
        // ---
        await DeviceUI.enable_2FA_auth();
    });
});

class DeviceUI {
    static async init() {
        const inizialized = await DeviceBusiness.init();
        if (inizialized !== true) return;
        // ---
        this.html_devices(DeviceBusiness.devices);
    }
    /**
     * 
     * @returns 
     */
    static async enable_2FA_auth() {
        const secret = await DeviceBusiness.enable_2FA_auth();
        if (!secret) return;
        const base32_secret = Bytes.base32.to(Bytes.hex.from(secret));
        const app_name = 'Vortex Vault';
        const username = LocalStorage.get('username-utente');
        // ---
        const uri = `otpauth://totp/${app_name}:${username}?secret=${base32_secret}&issuer=${app_name}`;
        const qrcode = new QRCode(document.querySelector('#qrcode-2fa-secret'), {
            text: uri,
            width: 180,
            height: 180,
            colorDark: "#FFFFFF",
            colorLight: "#272727",
            correctLevel: QRCode.CorrectLevel.H
        });
        // -- copio negli appunti il segreto
        navigator.clipboard.writeText(base32_secret);
        // ---
        Log.summon(0, `2FA attivato con successo`);
        setTimeout(() => {
            Log.summon(1, "Attenzione! Il Qr Code verrà invalidato tra 20 secondi");
            setTimeout(() => {
                document.querySelector('#qrcode-2fa-secret').innerHTML = '';
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
            ></device-list-item>`
        }
        // ---
        document.querySelector('#devices-list').innerHTML = html;
    }
}