import express from "express";
import { fileURLToPath } from 'url';
import path from 'path';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import {promises as fs} from 'fs';
import rateLimit from "express-rate-limit";
// -- router
const router = express.Router();
// -- rate limiter
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: "Troppe richieste, riprova più tardi",
});
router.use(limiter);
// -- middleware per servire i file statici
router.use(express.static(path.join(__dirname, '..', 'public')));
// --
router.get('/:page', async (req, res) => {
    const requested_file = path.join(__dirname, '..', 'public', `${req.params.page}.html`);
    try {
        // -- verifico se il file esiste
        await fs.access(requested_file, fs.constants.F_OK);
        res.sendFile(requested_file);
    } catch (err) {
        // console.log(err);
        // se il file non esiste 404
        res.status(404).send('File not found');
    }
});

export default router;