import { DeviceUI } from "../../js/device.ui.js";
import { Windows } from "../../utils/windows.js";

class BtnSyncDevice extends HTMLElement {
    constructor() {
        super();
    }

    render() {
        this.innerHTML = `<span class="material-symbols-rounded">sync_alt</span>Sincronizza`;
        this.addEventListener('click', async () => {
            Windows.loader(true);
            await DeviceUI.init();
            Windows.loader(false);
        });
    }

    connectedCallback() {
        this.render();
    }
}

customElements.define("btn-sync-device", BtnSyncDevice);        