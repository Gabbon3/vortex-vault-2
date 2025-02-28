export class Search {
    /**
     * @param {boolean} setContentManual Se true, utilizza 'search-context' invece di textContent
     * @param {Function} filterFn Funzione personalizzata per la ricerca
     */
    constructor(setContentManual = false, filterFn = null, queryPrepareFn = null, debounceTime = 500) {
        this.setContentManual = setContentManual;
        this.filterFn = filterFn || this.defaultFilter; // Usa filtro personalizzato se fornito
        this.queryPrepareFn = queryPrepareFn || this.defaultQueryPrepareFn;
        this.cache = {};
        this.elemento_ricerca = ['tr']; // Ora può essere un array
        this.debounceTime = debounceTime;
        this.debounceTimer = null; // Timer per il debounce
    }

    /**
     * Ricerca nelle tabelle
     * @param {HTMLElement} input Input di ricerca
     * @param {String} target ID della tabella target
     * @param {string|string[]} elemento_ricerca Elementi su cui eseguire la ricerca
     */
    tabella(input, target, elemento_ricerca = ['tr']) {
        const query = this.queryPrepareFn(input.value);
        const table = document.getElementById(target);

        if (!this.cache[target]) {
            this.elemento_ricerca = Array.isArray(elemento_ricerca) ? elemento_ricerca : [elemento_ricerca];
            this.crea_cache(target);
            this.osserva_modifiche(target);
        }

        // Aggiungi il debounce alla ricerca
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer); // Pulisce il timer precedente
        }

        this.debounceTimer = setTimeout(() => {
            // si adatta sia all'array che alla stringa
            table.classList.toggle('searching', query.length > 0);
            // ---
            for (const { riga, content } of this.cache[target]) {
                riga.style.display = this.filterFn(content, query) ? '' : 'none';
            }
        }, this.debounceTime);
    }

    /**
     * Crea la cache della tabella
     * @param {String} target ID della tabella target
     */
    crea_cache(target) {
        const righe = document.querySelectorAll(`#${target} ${this.elemento_ricerca.join(', ')}`);
        this.cache[target] = [];

        for (const riga of righe) {
            let content = this.setContentManual ? '' : riga.textContent.toLowerCase().replace(/\s+/g, ' ').trim();
            const extra = riga.getAttribute('search-context') ?? "";
            content += extra ? ` | ${extra.toLowerCase()}` : "";

            this.cache[target].push({ riga, content });
        }
    }

    /**
     * Invalida la cache della tabella
     * @param {String} target ID della tabella target
     */
    invalida_cache(target) {
        delete this.cache[target];
    }

    /**
     * Osserva le modifiche alla tabella e aggiorna la cache automaticamente
     * @param {String} target ID della tabella target
     */
    osserva_modifiche(target) {
        const tabella = document.getElementById(target);
        if (!tabella) return;

        const observer = new MutationObserver(() => {
            this.invalida_cache(target);
            this.crea_cache(target);
        });

        observer.observe(tabella, { childList: true, subtree: true, characterData: true });
    }

    /**
     * prepara il contenuto della query suddidendo tutti i termini di ricerca in un array
     * ad esempio @gabbo, ?1-2-2024 -> ["@gabbo", "?1-2-2024"]
     * @param {string} query 
     * @returns {Array}
     */
    defaultQueryPrepareFn(query) {
        if (!query) return [];
        query = query.toLowerCase().trim();
        return query.split(',').map(term => term.trim())
    }

    /**
     * Filtro di ricerca di default (supporta includes multiplo e wildcard `*`)
     * @param {string} content 
     * @param {Array} query 
     */
    defaultFilter(content, query) {
        // Per ogni termine della query
        return query.every(term => {
            // Se il termine è una regex
            // COMM: attualmente commentato, è esagerato
            // if (term.startsWith("/") && term.endsWith("/")) {
            //     try {
            //         const regex = new RegExp(term.slice(1, -1), "i");
            //         return regex.test(content); // Se il termine è una regex, lo testa direttamente
            //     } catch (e) {
            //         return false; // Se c'è un errore nella regex, non c'è match
            //     }
            // }
            // Se il termine contiene *, lo trasforma in regex
            if (term.includes("*")) {
                const regexPattern = term
                    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape per i caratteri speciali
                    .replace(/\*/g, ".*"); // Sostituisce * con .*

                const regex = new RegExp(regexPattern, "i");
                return regex.test(content); // Testa il contenuto con la regex
            }
            // Ricerca classica: se il termine è una stringa semplice, usa includes
            return content.includes(term);
        });
    }
}