export class Sliders {
    static initialized = false;
    static groups = {};
    /**
     * Inizializza gli sliders
     */
    static init() {
        if (this.initialized) return;
        this.initialized = true;
        /**
         * per ogni slider-container, memorizzo padding e margin, top e bottom
         * settandoli a 0, quindi lo slider è chiuso
         */
        document.querySelectorAll('.slider-cont').forEach(e => {
            const style = window.getComputedStyle(e);
            e.dataset.pt = parseFloat(style.paddingTop.replace('px', '')) || 0;
            e.dataset.pb = parseFloat(style.paddingBottom.replace('px', '')) || 0;
            e.classList.add('mpy-0');
        });
        /**
         * sliders
         */
        document.addEventListener("click", (e) => {
            const sliderBtn = e.target.closest('.slider');
            if (!sliderBtn) return;
            // ---
            const targetId = sliderBtn.getAttribute('slider');
            // logica di raggruppamento
            const group = sliderBtn.getAttribute('slider-group') ?? null;
            this.manageSlider(targetId, group);
        });
    }
    /**
     * Gestisce lo sliding
     * @param {string | HTMLElement} targetId - id dello slider container
     * @param {string} group - rappresenta il gruppo di appartenenza di uno slider
     * @param {boolean} [force=null] - forza true -> apertura; false -> chiusura del target 
     */
    static manageSlider(targetId, group = null, force = null) {
        const target = targetId instanceof HTMLElement ? targetId : document.getElementById(targetId);
        if (!target) return;
        //
        const lastTarget = group ? this.groups[group] : null;
        if (group && force == null && lastTarget) {
            this.manageSlider(lastTarget, null, false);
        }

        const isOpen = target.style.maxHeight;
        if (force === true) {
            open();
        }
        else if (force === false) {
            close();
        }
        else if (isOpen) {
            close();
        }
        else {
            open();
        }

        if (group) {
            this.groups[group] = targetId;
        }
        
        // mpy-0 indica -> margin e padding top e bottom = a 0
        const open = () => {
            target.classList.remove('mpy-0');
            target.classList.add('slider-open')
            this.updateSliderHeight(target);
            this.observeSlider(target);
        }

        const close = () => {
            this.disconnectObserver(target);
            target.style.maxHeight = null;
            target.classList.add('mpy-0');
            target.classList.remove('slider-open')
        }
    }
    /**
     * Osserva uno slider in caso di modifiche
     * @param {string} target 
     * @returns 
     */
    static observeSlider(target) {
        // Se già esiste, non duplicare
        if (target._sliderObserver) return;

        const observer = new MutationObserver(() => {
            this.updateSliderHeight(target);
        });

        observer.observe(target, {
            childList: true,
            subtree: true,
            characterData: true,
        });

        target._sliderObserver = observer;
    }
    /**
     * Aggiorna l'altezza massima di uno slider container
     * @param {HTMLElement} target 
     */
    static updateSliderHeight(target) {
        const contentHeight = target.scrollHeight + Number(target.dataset.pt) + Number(target.dataset.pb);
        target.style.maxHeight = contentHeight + 'px';
    }
    /**
     * Ferma l'observer e pulisci
     * @param {HTMLElement} target 
     */
    static disconnectObserver(target) {
        if (target._sliderObserver) {
            target._sliderObserver.disconnect();
            delete target._sliderObserver;
        }
    }
}

// window.Sliders = Sliders;