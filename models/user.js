import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { uuidv7 } from "uuidv7";

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
        recovery: { type: DataTypes.BLOB, allowNull: true }, // hash de codice di recupero
        mfa_secret: { type: DataTypes.BLOB, allowNull: true, defaultValue: null },
    },
    {
        tableName: "user",
        timestamps: true,
        underscored: true,
        charset: "utf8mb4",
        collate: "utf8mb4_unicode_ci",
    }
);
