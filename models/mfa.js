import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const MFA = sequelize.define(
    "MFA",
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: { 
            type: DataTypes.BIGINT, 
            allowNull: false 
        },
        secret: {
            type: DataTypes.BLOB,
            allowNull: false
        }
    },
    {
        tableName: "mfa",
        timestamps: true,
        underscored: true,
        charset: "utf8mb4",
        collate: "utf8mb4_unicode_ci",
    }
);