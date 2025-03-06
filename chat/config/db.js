import { RocksCRUD } from '../utils/rocksCRUD.js';
import { Config } from '../../server_config.js';
/**
 * ROCKS DB
 */
const rocksDb = new RocksCRUD(Config.ROCKSDB_MSG_PATH);

export { rocksDb };