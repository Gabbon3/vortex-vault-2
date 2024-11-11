export class Form {
    /**
     * Restituisce i dati di un form sotto forma di json
     * @param {String|HTMLElement} form 
     * @returns 
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
}