const { validationResult, body } = require('express-validator');
const mm = require('./globalModule.js');

const handleValidation = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: errors.array()[0].msg
        });
    }
};

const getData = (req) => ({
    NAME: req.body.NAME,
    MOBILE: req.body.MOBILE,
    EMAIL: req.body.EMAIL || '',
    STATUS: req.body.STATUS,
    ADDRESS: req.body.ADDRESS || '',
    FIREBASE_REG_TOKEN: req.body.FIREBASE_REG_TOKEN || ''
});


exports.validate = () => [
    body('NAME')
        .exists().withMessage('NAME parameter missing')
        .bail()
        .trim()
        .notEmpty().withMessage('NAME cannot be empty')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name max length is 100'),

    body('MOBILE')
        .exists().withMessage('MOBILE parameter missing')
        .bail()
        .trim()
        .isMobilePhone('en-IN').withMessage('Invalid mobile number'),

    body('STATUS')
        .exists().withMessage('STATUS parameter missing')
        .bail()
        .isIn([0, 1]).withMessage('STATUS must be 0 or 1'),

    body('ADDRESS')
        .optional()
        .trim()
        .isLength({ max: 500 }),

    body('EMAIL')
        .optional({ checkFalsy: true })
        .trim()
        .normalizeEmail()
        .isEmail().withMessage('Invalid email format')
        .isLength({ max: 64 }).withMessage('Email must be max 64 characters')
];

exports.validateUpdate = () => [
    body('ID')
        .exists().withMessage('ID parameter missing')
        .bail()
        .isInt().withMessage('ID should be number'),

    body('NAME').optional().trim().notEmpty().isLength({ min: 2, max: 100 }),
    body('MOBILE').optional().trim().isMobilePhone('en-IN'),
    body('STATUS').optional().isIn([0, 1]),
    body('ADDRESS').optional().trim().isLength({ max: 500 }),
    body('FIREBASE_REG_TOKEN').optional().trim()
];

exports.validateDelete = () => [
    body('ID')
        .exists().withMessage('ID parameter missing')
        .bail()
        .isInt().withMessage('ID should be number')
];


exports.get = async (req, res) => {

    let { sortKey = 'ID', sortValue = 'DESC', filter = '' } = req.body;

    try {

        const allowedSortKeys = ['ID', 'EMPLOYEE_ID', 'NAME', 'EMAIL'];

        if (!allowedSortKeys.includes(sortKey)) {
            sortKey = 'ID';
        }

        sortValue = (sortValue || 'DESC').toUpperCase();
        if (!['ASC', 'DESC'].includes(sortValue)) {
            sortValue = 'DESC';
        }

        if (mm.sanitizeFilter(filter)) {
            return res.status(400).json({
                success: false,
                message: "Invalid filter parameter."
            });
        }

        let query = `SELECT * FROM employee_master 
                    WHERE ARCHIVE = 0`;

        if (filter) {
            query += ` AND (${filter})`;
        }

        query += ` ORDER BY ${sortKey} ${sortValue}`;

        const result = await mm.executeQuery(query);

        return res.status(200).json({
            success: true,
            message: 'Employee Data',
            data: result
        });

    } catch (error) {

        console.error("GET Error:", error);

        if (error.code === "ER_BAD_FIELD_ERROR") {
            return res.status(400).json({
                success: false,
                message: "Invalid field in filter or sorting"
            });
        }

        if (error.code === "ER_PARSE_ERROR") {
            return res.status(400).json({
                success: false,
                message: "Invalid filter syntax"
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });

    }
};


exports.create = async (req, res) => {

    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {

        const data = getData(req);

        let query = `INSERT INTO employee_master 
                    (NAME, EMAIL, MOBILE, STATUS, ADDRESS, FIREBASE_REG_TOKEN, ARCHIVE)
                    VALUES (?, ?, ?, ?, ?, ?, 0)`;
        const insertData = [
            data.NAME,
            data.EMAIL,
            data.MOBILE,
            data.STATUS,
            data.ADDRESS,
            data.FIREBASE_REG_TOKEN
        ]

        const result = await mm.executeQuery(query, insertData);

        return res.status(201).json({
            success: true,
            message: "Employee created successfully",
            data: { insertId: result.insertId }
        });

    } catch (error) {

        console.error("\nCREATE Error:", error);
        console.log();

        if (error.code === 'ER_DUP_ENTRY') {

            let field = "Record";

            if (error.sqlMessage.includes('MOBILE')) field = "Mobile number";
            if (error.sqlMessage.includes('EMAIL')) field = "Email";

            return res.status(409).json({
                success: false,
                message: `${field} already exists`
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });

    }
};


exports.update = async (req, res) => {

    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {

        const id = req.body.ID;

        const allowedFields = [
            "NAME",
            "EMAIL",
            "MOBILE",
            "STATUS",
            "ADDRESS",
            "FIREBASE_REG_TOKEN"
        ];

        let updates = [];
        let values = [];

        for (let field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates.push(`${field}=?`);
                values.push(req.body[field]);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No fields provided to update"
            });
        }

        values.push(id);

        const query = `
            UPDATE employee_master
            SET ${updates.join(", ")}
            WHERE ID=? AND ARCHIVE=0
        `;

        const result = await mm.executeQuery(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Employee updated successfully"
        });

    } catch (error) {

        console.error("UPDATE Error:", error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: "Duplicate entry detected"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });

    }
};


exports.delete = async (req, res) => {

    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {

        const id = req.body.ID;

        let query = `UPDATE employee_master 
                     SET ARCHIVE = 1 
                     WHERE ID = ? AND ARCHIVE=0`;

        const result = await mm.executeQuery(query, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Employee deleted successfully"
        });

    } catch (error) {

        console.error("DELETE Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });

    }
};