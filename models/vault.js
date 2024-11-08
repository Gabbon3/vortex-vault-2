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
            type: DataTypes.INTEGER,
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
        underscored: true
    }
);