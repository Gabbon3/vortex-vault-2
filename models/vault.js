import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { uuidv7 } from "uuidv7";

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