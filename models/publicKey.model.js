import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

/**
 * Sul db bisogna creare l'indice hash e l'indice unico:
 * CREATE INDEX idx_public_key_id_hash ON public_key USING hash(id);
 * CREATE UNIQUE INDEX idx_public_key_id_unique ON public_key(id);
 */
export const PublicKey = sequelize.define(
    "PublicKey",
    {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
        },
        fingerprint: {
            type: DataTypes.STRING(64),
            allowNull: false,
            comment: "SHA-256 fingerprint"
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        device_name: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        device_info: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        last_seen_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null,
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        tableName: "public_key",
        timestamps: false,
        underscored: true,
        charset: "utf8mb4",
        collate: "utf8mb4_unicode_ci",
    }
);