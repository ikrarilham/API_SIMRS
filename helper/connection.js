/* Import From Node Modules*/
const db = require("mssql/msnodesqlv8");
// const { Sequelize } = require("sequelize");

/* Importing from ENV */
const { DB_USER, DB_PASSWORD, DB_SERVER, DB_DRIVER, DB_DATABASE, DB_PORT } =
  process.env;

const config = () => {
  console.log(DB_DATABASE);
  return {
    /* Configurate the Database */
    user: DB_USER,
    password: DB_PASSWORD,
    server: DB_SERVER,
    driver: DB_DRIVER,
    database: DB_DATABASE,
    option: {
      trustedconnection: false,
      instancename: "",
    },
    port: DB_PORT,
    /*End Configurate the Database */
  };
};

module.exports = config;
