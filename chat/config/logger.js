import pino from "pino";
import { Config } from "../../server_config.js";

// Crea un logger che scrive sia sulla console che su un file
export const logger = pino({
    level: 'debug',
    transport: {
        targets: [
            {
                target: 'pino-pretty', // Rende i log leggibili sulla console
                options: { colorize: true },
            },
            {
                target: 'pino/file', // Scrive i log su file
                options: { destination: Config.LOG_PATH }
            }
        ]
    }
});