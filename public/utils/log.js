export class Log {
    /**
     * Genera un nuovo log da mostrare all'utente
     * @param {number} lvl 0 success, 1 warning, 2 error, 3 info
     * @param {string} msg messaggio di errore
     */
    static summon(lvl = 0, msg = "") {
        const log = document.createElement("log-info");
        log.setAttribute("lvl", lvl);
        log.setAttribute("msg", msg);
        document.querySelector("#logs_container").appendChild(log);
    }
}

window.Log = Log;