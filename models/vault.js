import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const Vault = sequelize.define(
    'Vault',
    {
        id: {
            type: DataTypes.STRING(50),
            allowNull: false,
            primaryKey: true
        },
        user_id: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false
        },
        secrets: {
            type: DataTypes.BLOB,
            allowNull: false
        }
    },
    {
        tableName: 'vault',
        timestamps: true,
        underscored: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
    }
);