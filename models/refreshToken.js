import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { v7 as uuidv7 } from 'uuid';

export const RefreshToken = sequelize.define(
    "RefreshToken",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: () => uuidv7(),
            primaryKey: true,
        },
        user_id: { 
            type: DataTypes.UUID,
            allowNull: false 
        },
        device_name: {
            type: DataTypes.STRING(25),
            allowNull: false,
            defaultValue: "New device *",
        },
        public_key: {
            type: DataTypes.BLOB,
            allowNull: true,
            comment: "Chiave pubblica necessaria a derivare la chiave S locale",
        },
        user_agent_hash: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "MD5",
        },
        user_agent_summary: { type: DataTypes.STRING(100), allowNull: false },
        ip_address: { type: DataTypes.STRING(45) },
        iat: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        last_used_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        is_revoked: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    },
    {
        tableName: "refresh_token",
        timestamps: false,
        underscored: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
    }
);