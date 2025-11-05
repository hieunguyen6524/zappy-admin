// Knex configuration for MySQL using environment variables
require("dotenv").config();

/** @type {import('knex').Knex.Config} */
module.exports = {
  client: "mysql2",
  connection: {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "zappy_admin",
    supportBigNumbers: true,
    dateStrings: true,
  },
  pool: { min: 0, max: 10 },
  migrations: {
    tableName: "knex_migrations",
    directory: "./migrations",
  },
};
