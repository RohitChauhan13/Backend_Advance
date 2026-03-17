const jwt = require('jsonwebtoken');
const pool = require('../config/db.js');

exports.sanitizeFilter = (input) => {

    if (!input || typeof input !== 'string') return false;

    if (input.length > 200) return true;

    const dangerousPatterns = [
        /--/g,
        /;/g,
        /\/\*/g,
        /\*\//g,
        /\b(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|RENAME|GRANT|REVOKE|EXECUTE|UNION|ROLLBACK|COMMIT)\b/i
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(input)) {
            return true;
        }
    }

    const safePattern = /^[a-zA-Z0-9_\s=><'"().ANDOR]*$/i;

    if (!safePattern.test(input)) {
        return true;
    }

    return false;

};

exports.encryptValue = (value) => {
    const stringData = String(value);
    return CryptoJS.AES.encrypt(stringData, process.env.SECRET_KEY).toString();
};

exports.getSystemDate = () => {
    let date_ob = new Date();

    let day = ("0" + date_ob.getDate()).slice(-2);

    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

    let year = date_ob.getFullYear();

    let hours = ("0" + date_ob.getHours()).slice(-2);

    let minutes = ("0" + date_ob.getMinutes()).slice(-2);

    let seconds = ("0" + date_ob.getSeconds()).slice(-2);

    date_cur = year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;

    return date_cur;
};

exports.authMiddleware = (req, res, next) => {
    try {

        const apiKey = req.headers['apikey'];
        const applicationKey = req.headers['applicationkey'];
        const token = req.headers['token'];

        if (!apiKey || apiKey !== process.env.API_KEY) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized User"
            });
        }

        if (!applicationKey || applicationKey !== process.env.APPLICATION_KEY) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized User"
            });
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Token missing"
            });
        }

        try {

            const decoded = jwt.verify(token, process.env.SECRET_KEY);

            req.user = decoded;

            next();

        } catch (error) {

            return res.status(401).json({
                success: false,
                message: "Invalid Token"
            });

        }

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }
};

exports.executeQuery = async (query, params = []) => {
    let connection;
    try {
        connection = await pool.getConnection();

        const [result] = await connection.query(query, params);

        console.log("\n\nSuccess SQL Query: ", query);
        console.log("\nSuccess Data: ",params);
        console.log();

        return result;

    } catch (error) {
        console.log('\nFaild SQL Query: ', error.sql);
        throw error;

    } finally {
        if (connection) connection.release();
    }
};