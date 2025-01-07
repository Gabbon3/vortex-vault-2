import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { uuidv7 } from "uuidv7";

export const Passkey = sequelize.define(
    "Passkey",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: () => uuidv7(),
            primaryKey: true
        },
        credential_id: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            comment: "ID univoco della credenziale WebAuth"
        },
        public_key: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: "Chiave pubblica in binario per verificare le challenge"
        },
        sign_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: "Contatore di sicurezza per prevenire replay attacks"
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: "New passkey *",
            comment: "Nome della passkey",
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        attestation_format: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: "Formato della attestation (es. packed, fido-u2f, ecc.)",
        },
    },
    {
        tableName: "passkey",
        timestamps: true,
        underscored: true,
        charset: "utf8mb4",
        collate: "utf8mb4_unicode_ci",
    }
);