export class Form {
    static callbacks = {};
    /**
     * Inizializza il delegatore globale per i submit
     */
    static init() {
        document.addEventListener('submit', async (e) => {
            const form = e.target.closest('form');
            if (!form) return;

            const callbackName = form.getAttribute('id');
            if (!callbackName || !Form.callbacks[callbackName]) return;

            e.preventDefault();

            const data = Form.get_data(form);
            await Form.callbacks[callbackName](form, data);
        });
    }
    /**
     * Registra una callback da usare via attributo `data-callback`
     * @param {string} name - nome univoco della callback
     * @param {FormOnSubmitCallback} callback
     */
    static register(name, callback) {
        Form.callbacks[name] = callback;
    }
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
}

// window.Form = Form;