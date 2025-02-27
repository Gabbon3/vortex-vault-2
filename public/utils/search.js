export class Search {
    /**
     * Utilizza l'attributo 'search-context' per inserire del testo aggiuntivo che funziona nella ricerca
     */
    cache = {
        // usata per non ricericare sempre l'html
    }
    elemento_ricerca = 'tr';
    /**
     * Ricerca nelle tabelle
     * @param {HTMLElement} input input di ricerca
     * @param {String} target tabella target
     * @param {string} elemento_ricerca elemento figlio su cui eseguire la ricerca
     */
    tabella(input, target, elemento_ricerca = 'tr') {
        const match = input.value.toLowerCase();
        const table = document.getElementById(target);
        // Aggiungo la classe 'searching' alla tabella
        // Se non esiste già, crea la cache e inizia a monitorare la tabella per eventuali modifiche
        if (!this.cache[target]) {
            this.elemento_ricerca = elemento_ricerca;
            this.crea_cache(target, elemento_ricerca);
            this.osserva_modifiche(target); // Inizia a osservare eventuali modifiche alla tabella
        }
        match === '' ? 
            table.classList.remove('searching') :
            table.classList.add('searching');
        // -- ottengo le righe dalla cache
        const righe_cache = this.cache[target];
        for (let i = 0; i < righe_cache.length; i++) {
            const { riga, content } = righe_cache[i];
            // ---
            riga.style.display = content.includes(match) ? '' : 'none';
        }
    }
    /**
     * Crea la cache per una tabella specifica
     * @param {String} target ID della tabella target
     */
    crea_cache(target, elemento_ricerca) {
        const righe = document.querySelectorAll("#" + target + " " + elemento_ricerca);
        this.cache[target] = [];
        for (let r = 0; r < righe.length; r++) {
            const riga = righe[r];
            // -- salva il contenuto in un array
            let content = riga.textContent.toLowerCase()
                .replace(/\s+/g, ' ') // Sostituisce tutti gli spazi multipli con uno singolo
                .trim(); // Rimuove gli spazi iniziali e finali
            // -- attirbuto con altro testo che puo essere cercato
            content += riga.getAttribute('search-context') ?? "";
            this.cache[target].push({ riga, content });
        }
    }

    /**
     * Invalida la cache per una tabella
     * @param {String} target ID della tabella target
     */
    invalida_cache(target) {
        if (this.cache[target]) {
            delete this.cache[target];
        }
    }

    /**
     * Osserva le modifiche alla tabella e invalida la cache se vengono rilevate modifiche
     * @param {String} target ID della tabella target
     */
    osserva_modifiche(target) {
        const tabella = document.getElementById(target);
        if (!tabella) return;
        // ---
        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    // -- se ci sono cambiamenti nella lista dei nodi o nel contenuto, invalida la cache
                    this.invalida_cache(target);
                    this.crea_cache(target, this.elemento_ricerca);  // -- ricarica la cache aggiornata
                    break;
                }
            }
        });
        // -- configura l'osservatore per monitorare modifiche al contenuto e alla struttura della tabella
        observer.observe(tabella, {
            childList: true,           // Per rilevare aggiunta/rimozione di righe
            subtree: true,             // Include i nodi figli
            characterData: true        // Rileva modifiche al testo all'interno delle celle
        });
    }
};