// MOTION ONE
// import { animate, scroll } from "https://cdn.jsdelivr.net/npm/motion@latest/+esm";
// WASM
import '../secure/rust.init.js';
// ---
import './footer.component.js';
import './navbar.component.js';
import './log.component.js';
import './vault-li.component.js';
import './custom-vault-section.component.js';
import './colored-password.component.js';
import './password-strenght-bar.component.js';
import './email-verify-btn.component.js';
import './btn-copy.component.js';
import './btn-paste.component.js';
import './mfa-input.component.js';
import './passkey-btn.component.js';
import './passkey-list-item.component.js';
import './otp-copy-button.component.js';
import './btn-hide-show-protect-input.component.js';
import './settings/tools.component.js';
import { Windows } from '../utils/windows.js';
import { QrCodeDisplay } from '../utils/qrcode-display.js';
import '../js/theme.ui.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log(
`__         __  __         __
\\ \\       / /  \\ \\       / /
 \\ \\     / /    \\ \\     / /
  \\ \\   / /      \\ \\   / /
   \\ \\_/ /        \\ \\_/ /
    \\___/ ORTEX    \\___/ AUTL`);
    QrCodeDisplay.init();
    /**
     * FINESTRE
     */
    document.addEventListener("click", function(event) {
        const btn = event.target.closest(".close");
        if (btn) {
            const target = btn.getAttribute("data-target-close");
            Windows.close(target);
        }
    });
    document.addEventListener("click", function(event) {
        const btn = event.target.closest(".open");
        if (btn) {
            const target = btn.getAttribute("data-target-open");
            Windows.open(target);
        }
    });    
    /**
     * pulsanti che richiedono l'animazione di check
     */
    document.addEventListener('click', (e) => {
        const ca = e.target.closest('.CA');
        if (!ca) return;
    
        const btn = ca.querySelector('span');
        const currentIcon = btn.textContent;
        if (currentIcon === 'check') return;
    
        btn.textContent = 'check';
        setTimeout(() => {
            btn.textContent = currentIcon;
        }, 1000);
    });    
    /**
     * Pulsanti cancella testo
     */
    document.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.del-val');
        if (!delBtn) return;
    
        const targetId = delBtn.getAttribute('data-target-del');
        const target = document.getElementById(targetId);
        if (!target) return;
    
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            target.value = '';
        } else {
            target.textContent = '';
        }
    
        const keyupEvent = new KeyboardEvent('keyup', {
            key: 'Delete',
            bubbles: true,
            cancelable: true,
        });
    
        target.dispatchEvent(keyupEvent);
    });    
    /**
     * Chiudi Caricamento
     */
    document.querySelector('#loader', 'dblclick', (e) => {
        e.currentTarget.classList.remove('show');
    });
    /**
     * per ogni slider-container, elimino padding top e bottom e memorizzo anche 
     */
    document.querySelectorAll('.slider-cont').forEach(e => {
        const style = window.getComputedStyle(e);
        e.dataset.pt = pxToNumber(style.paddingTop);
        e.dataset.pb = pxToNumber(style.paddingBottom);
        e.style.paddingBottom = 0;
        e.style.paddingTop = 0;
    });
    /**
     * sliders
     */
    document.addEventListener("click", (e) => {
        const sliderBtn = e.target.closest('.slider');
        if (!sliderBtn) return;
    
        const targetId = sliderBtn.getAttribute('slider');
        const target = document.getElementById(targetId);
        if (!target) return;
    
        const isOpen = target.style.maxHeight;
        target.classList.toggle('slider-open');
    
        if (isOpen) {
            target.style.maxHeight = null;
            target.style.paddingTop = 0;
            target.style.paddingBottom = 0;
        } else {
            target.style.paddingTop = null;
            target.style.paddingBottom = null;
            const contentHeight = target.scrollHeight + Number(target.dataset.pt) + Number(target.dataset.pb);
            target.style.maxHeight = contentHeight + 'px';
        }
    });

    function pxToNumber(px) {
        return parseFloat(px.replace('px', '')) || 0;
    }
});