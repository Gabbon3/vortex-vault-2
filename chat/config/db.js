import { RocksCRUD } from "../utils/rocksCRUD.js";
import { Config } from "../../server_config.js";
import { mkdir } from "fs/promises";
// creo la cartella se non esiste
mkdir(Config.ROCKSDB_MSG_PATH, { recursive: true }, (err) => {
    if (err && err.code !== "EEXIST") {
        throw err;
    }
});
/**
 * ROCKS DB
 */
const rocksDb = new RocksCRUD(Config.ROCKSDB_MSG_PATH);

export { rocksDb };
