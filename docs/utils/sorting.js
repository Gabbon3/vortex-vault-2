export const sort_utils = {
    /**
     * Ordina un array di oggetti in base ai criteri specificati.
     * @param {Array<Object>} array - L'array di oggetti da ordinare.
     * @param {Object} criteri - Oggetto con chiavi che rappresentano gli attributi degli oggetti e valori booleani:
     *                           `true` per ordinamento crescente, `false` per ordinamento decrescente.
     */
    object_arr: (array, criteri) => {
        array.sort((a, b) => {
            for (const [chiave, crescente] of Object.entries(criteri)) {
                const confronto = (a[chiave] > b[chiave]) - (a[chiave] < b[chiave]);
                if (confronto !== 0) return crescente ? confronto : -confronto;
            }
            return 0;
        });
    },
};