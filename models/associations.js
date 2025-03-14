import { RefreshToken } from "./refreshToken.js";
import { User } from "./user.js";
import { Vault } from "./vault.js";
import { Backup } from "./backup.js";
import { Passkey } from "./passkey.model.js";

/*
 * In questo file sono presenti tutte le relazioni
 */

// Relazione 1 utente - N refresh token
User.hasMany(RefreshToken, { 
    foreignKey: "user_id", 
    onDelete: "CASCADE",
});
RefreshToken.belongsTo(User, { 
    foreignKey: "user_id", 
    onDelete: "CASCADE",
});

// Relazione 1 utente - N vault
User.hasMany(Vault, { 
    foreignKey: "user_id",
    onDelete: "CASCADE",
});
Vault.belongsTo(User, { 
    foreignKey: "user_id", 
    onDelete: "CASCADE",
});

// Relazione 1 utente - N backup
User.hasMany(Backup, {
    foreignKey: "user_id",
    onDelete: "CASCADE",
});
Backup.belongsTo(User, {
    foreignKey: "user_id",
    onDelete: "CASCADE",
});

// Relazione 1 utente - N passkey
User.hasMany(Passkey, {
    foreignKey: "user_id",
    onDelete: "CASCADE",
});
Passkey.belongsTo(User, {
    foreignKey: "user_id",
    onDelete: "CASCADE",
});