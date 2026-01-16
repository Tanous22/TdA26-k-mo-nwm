import "dotenv/config";
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("CHYBA: V .env chybí DATABASE_URL!");
}
export const config = {
    port: process.env.PORT || 3000,
    db: {
    url: databaseUrl,
    },
};
