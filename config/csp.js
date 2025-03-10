export const csp_middleware = (req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm https://cdn.jsdelivr.net/npm/dijkstrajs@1.0.3/+esm https://code.jquery.com/jquery-3.7.0.js; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ws://localhost:8080; img-src 'self' data:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests; block-all-mixed-content;"
    );
    next();
}

export const security_headers = (req, res, next) => {
    // Referrer-Policy:
    // Controlla come il browser invia informazioni relative alla pagina di provenienza (referer)
    res.setHeader('Referrer-Policy', 'no-referrer');
    // Permissions-Policy (ex-Feature-Policy):
    // Limita l'accesso a funzionalità del browser come geolocalizzazione, microfono, fotocamera, ecc.
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    // X-Content-Type-Options:
    // Impedisce ai browser di provare a indovinare il tipo di contenuto e forzare il controllo del tipo MIME.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // X-Frame-Options:
    // Previene il clickjacking impedendo che la tua pagina venga caricata in un iframe da altri domini.
    res.setHeader('X-Frame-Options', 'DENY');
    next();
};