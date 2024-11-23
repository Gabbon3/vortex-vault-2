import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const Backup = sequelize.define(
    "Backup",
    {
        id: { 
            type: DataTypes.BIGINT.UNSIGNED, 
            primaryKey: true,
            autoIncrement: true 
        },
        user_id: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            unique: true
        },
        expire: {
            type: DataTypes.DATE,
            defaultValue: sequelize.literal('DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 2 MONTH)'),
            allowNull: false
        },
        bin: {
            type: DataTypes.BLOB('long'),
            allowNull: false,
        }
    },
    {
        tableName: "backup",
        timestamps: true,
        underscored: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
    }
);
