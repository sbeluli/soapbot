/*
 * Copyright (C) 2024  Sage Beluli
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * Contact details for information regarding this program and its license
 * can be found on sophiabeluli.ca
 */

import { Database } from "sqlite3";

export const execute = async (db: Database, sql: string) => {
    return new Promise<void>((resolve, reject) => {
        db.exec(sql, (err) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
};

export const get = async (db: Database, sql: string) => {
    return new Promise<any>((resolve, reject) => {
        db.get(sql, (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
};

export const runWithParams = async (db: Database, sql: string, params: any[]) => {
    return new Promise<void>((resolve, reject) => {
        db.run(sql, params, (err) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
};

export const getWithParams = async (db: Database, sql: string, params: any[]) => {
    return new Promise<any>((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
};

export const allWithParams = async (db: Database, sql: string, params: any[]) => {
    return new Promise<any[]>((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
};
