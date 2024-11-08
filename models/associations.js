import { RefreshToken } from "./refreshToken.js";
import { User } from "./User.js";
import { Vault } from "./vault.js";

/*
 * In questo file sono presenti tutte le relazioni
 */

// Relazione 1 utente - N refresh token
User.hasMany(RefreshToken, { foreignKey: "user_id" });
RefreshToken.belongsTo(User, { foreignKey: "user_id" });
// Relazione 1 utente - N vault
User.hasMany(Vault, { foreignKey: "user_id" });
Vault.belongsTo(User, { foreignKey: "user_id" });