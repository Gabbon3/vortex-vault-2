import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { v7 as uuidv7 } from 'uuid';

export const Vault = sequelize.define(
    'Vault',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: () => uuidv7(),
            primaryKey: true
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        secrets: {
            type: DataTypes.BLOB,
            allowNull: false
        },
        deleted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
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