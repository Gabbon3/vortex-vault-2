export class Windows {
    static current = null;
    static bc = null;
    /**
     * Apre una finestra nel document
     * @param {String} target id della finestra html
     */
    static open(target) {
        const div = document.getElementById(target);
        if (!div) return;
        this.current = target;
        // ---
        div.classList.add('open');
        $("#bc-finestre").attr("data-target", target);
        $("#bc-finestre").fadeIn(150);
    }
    /**
     * Chiude una finestra nel document
     * @param {String} target id della finestra html
     */
    static close(target = this.current) {
        if (!target) return;
        document.getElementById(target).classList.remove('open');
        $("#bc-finestre").fadeOut(150);
    }
    /**
     * schermata di caricamento
     * @param {boolean} active
     */
    static loader(active) {
        if (active) {
            $("#loader").fadeIn(150);
        } else {
            $("#loader").fadeOut(150);
        }
    }
}