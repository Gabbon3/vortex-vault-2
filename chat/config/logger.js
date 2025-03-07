import pino from "pino";
import { Config } from "../../server_config.js";

// Crea un logger che scrive sia sulla console che su un file
export const logger = pino({
    level: 'debug',
    transport: {
        targets: [
            {
                target: 'pino-pretty',
                options: { 
                    colorize: true,
                    ignore: "pid,hostname",
                    translateTime: "HH:MM:ss"
                },
            },
            {
                target: 'pino-pretty', // Scrive i log su file
                options: { 
                    destination: Config.LOG_PATH,
                    colorize: false, 
                    ignore: "pid,hostname",
                    translateTime: "dd-mm-yyyy HH:MM",
                }
            }
        ]
    }
});