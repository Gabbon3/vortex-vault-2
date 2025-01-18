import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { v7 as uuidv7 } from 'uuid';

export const User = sequelize.define(
    "User",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: () => uuidv7(),
            primaryKey: true,
        },
        email: { type: DataTypes.STRING, allowNull: false, unique: true },
        verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        password: { type: DataTypes.STRING, allowNull: false },
        salt: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "16 byte HEX",
        },
        vault_update: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: new Date(),
        },
        recovery: { type: DataTypes.BLOB, allowNull: true, comment: "Dati cifrati insieme alla chiave pubblica ecdh" },
    },
    {
        tableName: "user",
        timestamps: true,
        underscored: true,
        charset: "utf8mb4",
        collate: "utf8mb4_unicode_ci",
    }
);
