import './navbar.component.js';
import './log.component.js';
import './vault-li.component.js';
import './footer.component.js';
import './device-list-item.component.js';
import './custom-vault-section.js';

$(document).ready(() => {
    /**
     * FINESTRE
     */
    $(document).on("click", ".close", (btn) => {
        btn = btn.currentTarget;
        const target = $(btn).attr("data-target-close");
        finestra.close(target);
    });
    $(document).on("click", ".open", (btn) => {
        btn = btn.currentTarget;
        const target = $(btn).attr("data-target-open");
        finestra.open(target);
    });
    $("#bc-finestre").click((bc) => {
        bc = bc.currentTarget;
        const target = $(bc).attr("data-target");
        finestra.close(target);
    });
    /**
     * pulsanti con open-close aprono e chiudono finestre
     * data-target = finestra_da_aprire;finestra_da_chiudere
     */
    $(document).on("click", '.open-close', (e) => {
        const btn = e.currentTarget;
        // ---
        const [open, close] = $(btn).attr("data-target").split(';');
        dom.hide('#' + close);
        finestra.open(open);
    });
    /**
     * pulsanti che richiedono l'animazione di check
     */
    $(document).on('click', '.CA', (e) => {
        const btn = e.currentTarget.querySelector('span');
        const current_icon = btn.textContent;
        if (current_icon === 'check') return;
        // ---
        btn.textContent = 'check';
        setTimeout(() => {
            btn.textContent = current_icon;
        }, 1000);
    });
    /**
     * pulsanti copia
     */
    $(document).on('click', '.copy-val', (e) => {
        const target = document.getElementById(e.currentTarget.getAttribute('data-target-cc')); // cc sta per copy
        navigator.clipboard.writeText(target.value);
    });
    /**
     * pulsanti incolla
     */
    $(document).on('click', '.paste-val', (e) => {
        const target = document.getElementById(e.currentTarget.getAttribute('data-target-pa')); // pa sta per paste
        navigator.clipboard.readText().then((text) => {
            target.value = text;
        }).catch((error) => { console.warn(error) });
    });
    /**
     * Pulsanti cancella testo
     */
    $(document).on('click', '.del-val', (e) => {
        const target = document.getElementById(e.currentTarget.getAttribute('data-target-del'));
        target.value = '';
        // --- simulo l'evento
        const keyupevent = new KeyboardEvent('keyup', {
            key: 'Delete',
            bubbles: true,
            cancelable: true,
        });
        // ---
        target.dispatchEvent(keyupevent);
    });
    /**
     * Chiudi Caricamento
     */
    $('#loader').on('dblclick', (e) => {
        $(e.currentTarget).fadeOut(200);
    })
});

export const finestra = {
    /**
     * Apre una finestra nel document
     * @param {String} target id della finestra html
     */
    open(target) {
        const div = $("#" + target);
        if (div.length > 0) {
            document.getElementById(target).classList.add('open');
            $("#bc-finestre").attr("data-target", target);
            $("#bc-finestre").fadeIn(150);
        }
    },
    /**
     * Chiude una finestra nel document
     * @param {String} target id della finestra html
     */
    close(target) {
        document.getElementById(target).classList.remove('open');
        $("#bc-finestre").fadeOut(150);
    },
    /**
     * schermata di caricamento
     * @param {boolean} active 
     */
    loader(active) {
        if (active) {
            $("#loader").fadeIn(200);
        } else {
            $("#loader").fadeOut(200);
        }
    },
};