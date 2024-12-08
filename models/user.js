import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const User = sequelize.define(
    "User",
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        username: { type: DataTypes.STRING, allowNull: false, unique: true },
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
    },
    {
        tableName: "user",
        timestamps: true,
        underscored: true,
        charset: "utf8mb4",
        collate: "utf8mb4_unicode_ci",
    }
);
