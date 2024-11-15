export class Form {
    /**
     * Restituisce i dati di un form sotto forma di json
     * @param {String|HTMLElement} form 
     * @returns {Object} - Oggetto contenente i dati del form
     */
    static get_data(form) {
        let elements;
        // ---
        if (typeof form === 'string') elements = document.getElementById(form).elements;
        else elements = form.elements;
        // ---
        const json = {};
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
                let value = element.value;
                const type = element.getAttribute('type');
                // ---
                switch (type) {
                    case 'checkbox':
                    case 'radio':
                        value = value == 'on';
                        break;
                    case 'number':
                        value = Number(value);
                        break;
                }
                // ---
                json[element.getAttribute('name')] = value;
            }
        }
        // ---
        return json;
    }
    /**
     * Aggiunge un evento di submit al form
     * @param {string} form_id - L'ID del form.
     * @param {FormOnSubmitCallback} callback - La funzione di callback eseguita al submit.
     */
    static onsubmit(form_id, callback) {
        $(`#${form_id}`).on('submit', async (e) => {
            e.preventDefault();
            callback(e.currentTarget, Form.get_data(e.currentTarget));
        });
    }
    /**
     * Questo callback gestisce l'evento submit dei form
     * @callback FormOnSubmitCallback
     * @param {HTMLElement} form - Elemento html del form
     * @param {Object} elements - un oggetto che contiene gli input del form indicati tramite i loro "name"
     */
}