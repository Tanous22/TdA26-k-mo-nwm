import mysql from "mysql2/promise";
import { config } from "../db/config"; // Tady si to načte z toho nového souboru

export const pool = mysql.createPool(config.db.url);