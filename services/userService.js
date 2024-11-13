import { User } from "../models/User.js";
import bcrypt from 'bcryptjs';
import { TokenUtils } from "../utils/tokenUtils.js";
import { RefreshTokenService } from "./refreshTokenService.js";
import { CError } from "../helpers/cError.js";
import { Cripto } from "../utils/cryptoUtils.js";

export class UserService {
    constructor() {
        this.refresh_token_service = new RefreshTokenService();
    }
    /**
     * Registra un utente sul db
     * @param {string} username 
     * @param {string} password 
     * @returns {string} id dell'utente appena inserito
     */
    async registra(username, password) {
        // -- verifico che l'username sia disponibile
        const user_exist = await User.findOne({
            where: { username }
        });
        if (user_exist) throw new CError("UserExist", "Questo username non è disponibile", 409);
        // -- genero il salt di 16 byte
        const salt = Cripto.random_bytes(16, 'hex');
        // -- creo un nuovo utente
        const password_hash = await this.hash_password(password);
        const user = new User({ username, password: password_hash, salt });
        // ---
        return await user.save();
    }
    /**
     * Esegue l'accesso e restituisce un utente 
     * @param {string} username 
     * @param {string} password 
     * @param {string} user_agent 
     * @param {string} ip_address
     * @returns {Object} - access_token, user
     */
    async accedi(username, password, user_agent, ip_address) {
        // -- cerco se l'utente esiste
        const user = await User.findOne({
            where: { username }
        });
        if (!user) throw new CError("AuthenticationError", "Username o password non validi", 401);
        // -- cerco se la password è corretta
        const password_is_correct = await this.verify_password(password, user.password);
        if (!password_is_correct) throw new CError("AuthenticationError", "Username o password non validi", 401);
        // -- Access Token
        const access_token = TokenUtils.genera_access_token(user.id);
        // -- Refresh Token
        // - elimino i token associati
        const user_agent_hash = this.refresh_token_service.user_agent_hash(user_agent);
        await this.refresh_token_service.delete_old_tokens(user.id, user_agent_hash);
        const refresh_token = await this.refresh_token_service.create(user.id, user_agent, ip_address);
        // ---
        return { access_token, refresh_token, user };
    }
    /**
     * Aggiorna un qualunque campo dell'utente
     * @param {string} uid
     * @param {Object} updated_info un oggetto con le informazioni da modificare
     * @returns
     */
    async update_user_info(uid, updated_info) {
        return await User.update(
            updated_info,
            { where: { id: uid } }
        );
    }
    /**
     * Esegue l'hash della password utilizzando bcrypt
     * @param {string} password 
     * @returns {string}
     */
    async hash_password(password) {
        return await bcrypt.hash(password, 10);
    }
    /**
     * Verifica se una password corrisponde ad un hash usando bcrypt
     * @param {string} password 
     * @param {string} password_hash 
     * @returns {boolean}
     */
    async verify_password(password, password_hash) {
        return await bcrypt.compare(password, password_hash);
    }
}