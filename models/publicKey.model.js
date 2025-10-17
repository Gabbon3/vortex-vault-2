import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

/**
 * Sul db bisogna creare l'indice hash e l'indice unico:
 * CREATE INDEX idx_public_key_id_hash ON public_key USING hash(sid);
 * CREATE UNIQUE INDEX idx_public_key_id_unique ON public_key(sid);
 * 
create table public_key (
	sid uuid not null primary key,
	fingerprint varchar(64) not null,
	user_id uuid not null,
	device_name varchar(20),
	device_info varchar(100) not null,
	last_seen_at timestamp default null,
	created_at timestamp
);
 */
export const PublicKey = sequelize.define(
    "PublicKey",
    {
        sid: {
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