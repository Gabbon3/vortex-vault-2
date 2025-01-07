export const csp_middleware = (req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm https://cdn.jsdelivr.net/npm/dijkstrajs@1.0.3/+esm https://code.jquery.com/jquery-3.7.0.js; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests; block-all-mixed-content;"
    );
    next();
}