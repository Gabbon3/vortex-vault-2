import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const Passkey = sequelize.define(
    "Passkey",
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true
        },
        credential_id: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            comment: "ID univoco della credenziale WebAuth"
        },
        public_key: {
            type: DataTypes.BLOB,
            allowNull: false,
            comment: "Chiave pubblica in binario per verificare le challenge"
        },
        sign_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: "Contatore di sicurezza per prevenire replay attacks"
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false
        }
    },
    {
        tableName: "passkey",
        timestamps: true,
        underscored: true,
        charset: "utf8mb4",
        collate: "utf8mb4_unicode_ci",
    }
);