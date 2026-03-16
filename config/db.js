require('dotenv').config({ quiet: true });
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,

    ssl: {
        ca: process.env.CA_SERTIFICATE
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+05:30',
    charset: 'utf8mb4',
    dateStrings: true
});

const TestConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log("Database connected successfully..!");
        connection.release();
    } catch (error) {
        console.error("Faild to connect with database");
        console.error(error);
    }
}

TestConnection();

module.exports = pool;