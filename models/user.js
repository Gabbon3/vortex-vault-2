import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const User = sequelize.define(
    "User",
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        username: { type: DataTypes.STRING, allowNull: false, unique: true },
        password: { type: DataTypes.STRING, allowNull: false },
        salt: { type: DataTypes.STRING(32), allowNull: false, comment: "16 byte HEX" },
        vault_update: { type: DataTypes.DATE, allowNull: false, defaultValue: new Date() },
        recovery: { type: DataTypes.STRING, allowNull: true }, // hash de codice di recupero
        totp_secret: { type: DataTypes.STRING(40), allowNull: true },
    },
    {
        tableName: "user",
        timestamps: true,
        underscored: true,
    }
);
