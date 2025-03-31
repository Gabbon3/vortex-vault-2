import { Config } from "../server_config.js";

export const csp_middleware = (req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        `default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm https://cdn.jsdelivr.net/npm/dijkstrajs@1.0.3/+esm https://code.jquery.com/jquery-3.7.0.js; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ws://${Config.WSORIGIN} wss://${Config.WSORIGIN}; img-src 'self' data:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests; block-all-mixed-content;`
    );
    next();
}

export const security_headers = (req, res, next) => {
    // 🕵️‍♂️ Referrer-Policy
    // -- controlla se e come viene inviato il referrer tra pagine → migliora la privacy
    res.setHeader('Referrer-Policy', 'no-referrer');

    // 🔒 Permissions-Policy (ex Feature-Policy)
    // -- disabilita funzioni del browser per impedire abusi (geolocazione, microfono, ecc.)
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // 🔐 X-Content-Type-Options
    // -- impedisce al browser di "indovinare" il tipo MIME dei contenuti → evita esecuzione non intenzionale
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // 🛑 X-Frame-Options
    // -- impedisce il caricamento della tua app in iframe → previene clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    next();
};

export const cors_middleware = (req, res, next) => {

    // 🌐 Access-Control-Allow-Origin
    // -- specifica quali domini possono accedere alle tue risorse via browser (necessario per CORS)
    // ⚠️ NON usare wildcard (*)
    res.setHeader('Access-Control-Allow-Origin', Config.ORIGIN);

    // 🔐 Access-Control-Allow-Credentials
    // -- permette l'invio dei cookie (o header Authorization) nelle richieste cross-origin
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // 🔁 Access-Control-Allow-Methods
    // -- elenca i metodi HTTP permessi nelle richieste CORS
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    // 📦 Access-Control-Allow-Headers
    // -- specifica quali header personalizzati possono essere inviati
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    // ---
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
};