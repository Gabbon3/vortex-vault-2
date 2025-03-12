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
            if (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.tagName === "SELECT") {
                // ---
                const name = element.getAttribute('name');
                if (!name) continue;
                // ---
                let value = element.value;
                const type = element.getAttribute('type');
                // ---
                switch (type) {
                    case 'checkbox':
                        value = element.checked;
                        break;
                    case 'radio':
                        value = value == 'on';
                        break;
                    case 'number':
                    case 'range':
                        value = Number(value);
                        break;
                    case 'file':
                        value = element.files.length > 0 ? element.files[0] : null;
                        break;
                        
                }
                // ---
                json[name] = value;
            }
        }
        // ---
        return json;
    }
    /**
     * Aggiunge un evento di submit al form
     * @param {string | HTMLElement} form_id - L'ID del form o il form direttamente.
     * @param {FormOnSubmitCallback} callback - La funzione di callback eseguita al submit.
     */
    static onsubmit(form_id, callback) {
        const form = form_id instanceof HTMLElement ? form_id : document.getElementById(form_id);
        if (!form) return;
        // ---
        form.addEventListener('submit', async (e) => {
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

window.Form = Form;