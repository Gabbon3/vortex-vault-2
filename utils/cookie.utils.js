export const cookieUtils = {
    /**
     * Imposta un cookie selezionando il nome in automatico
     * @param {Request} req 
     * @param {Response} res 
     * @param {string} baseName 
     * @param {string} value 
     * @param {{}} options 
     */
    setCookie(req, res, baseName, value, options = {}) {
        const name = req.isExtension ? `ext-${baseName}` : baseName;
        res.cookie(name, value, options);
    },
    /**
     * Restituisce un cookie dell'estensione o della web app
     * @param {Request} req 
     * @param {string} baseName 
     * @returns {string}
     */
    getCookie(req, baseName) {
        const name = req.isExtension ? `ext-${baseName}` : baseName;
        return req.cookies[name];
    },
    /**
    * Elimina un cookie in modo sicuro
    * @param {Request} req 
    * @param {Response} res 
    * @param {string} baseName 
    * @param {{}} options
    */
    deleteCookie(req, res, baseName, options = {}) {
        const name = req.isExtension ? `ext-${baseName}` : baseName;
        res.clearCookie(name, {
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
            path: "/",
            ...options
        });
    }
}