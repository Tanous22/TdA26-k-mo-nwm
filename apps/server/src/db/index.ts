import mysql from "mysql2/promise";
import { config } from "../db/config"; // Tady si to načte z toho nového souboru
export const pool = mysql.createPool({
    uri: config.db.url,        // Zde předáme tu URL z configu
    waitForConnections: true,  // Když je plno, zařadit požadavek do fronty
    connectionLimit: 10,       // Maximálně 10 otevřených spojení naráz
    queueLimit: 0              // Fronta čekajících může být nekonečná
});
