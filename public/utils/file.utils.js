export class FileUtils {
    /**
     * Restituisce il contenuto di un file
     * @param {*} file_ 
     * @returns {ArrayBuffer}
     */
    static async read(file_, asBuffer = true) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            // ---
            reader.onload = function (event) {
                const content = event.target.result;
                resolve(content);
            };
            // ---
            reader.onerror = function (event) {
                reject(event.target.error);
            };
            // ---
            asBuffer ? reader.readAsArrayBuffer(file_) : reader.readAsText(file_);
        });
    }
    /**
     * Scarica un file
     * type: binario -> application/octet-stream, 
     * @param {String} file_name nome
     * @param {String} extension estensione
     * @param {String} file_content contenuto
     * @param {String} type tipo, default 'text/plain'
     */
    static async download(file_name, extension, file_content, type = 'text/plain') {
        const blob = new Blob([file_content], { type: type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file_name + '.' + extension;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}