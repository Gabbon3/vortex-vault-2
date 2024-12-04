import { RefreshToken } from "./refreshToken.js";
import { User } from "./user.js";
import { Vault } from "./vault.js";
import { Backup } from "./backup.js";

/*
 * In questo file sono presenti tutte le relazioni
 */

// Relazione 1 utente - N refresh token
User.hasMany(RefreshToken, { 
    foreignKey: "user_id" 
});
RefreshToken.belongsTo(User, { 
    foreignKey: "user_id", 
    onDelete: "CASCADE",
});

// Relazione 1 utente - N vault
User.hasMany(Vault, { 
    foreignKey: "user_id" 
});
Vault.belongsTo(User, { 
    foreignKey: "user_id", 
    onDelete: "CASCADE",
});

// Relazione 1 utente - N backup
User.hasMany(Backup, {
    foreignKey: "user_id",
});
Backup.belongsTo(User, {
    foreignKey: "user_id",
    onDelete: "CASCADE",
});