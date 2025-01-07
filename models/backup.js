import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { v7 as uuidv7 } from 'uuid';

export const Backup = sequelize.define(
    "Backup",
    {
        id: { 
            type: DataTypes.UUID,
            defaultValue: () => uuidv7(),
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true
        },
        expire: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null,
        },
        bin: {
            type: DataTypes.BLOB,
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
