const pool = require('../config/db.js');
const { validationResult, body } = require('express-validator');
const mm = require('./globalModule.js');

const getData = (req) => {
    var data = {
        NAME: req.body.NAME,
        MOBILE: req.body.MOBILE,
        STATUS: req.body.STATUS,
        ADDRESS: req.body.ADDRESS ? req.body.ADDRESS : '',
        FIREBASE_REG_TOKEN: req.body.FIREBASE_REG_TOKEN ? req.body.FIREBASE_REG_TOKEN : null
    }
    return data;
}

exports.validate = () => {
    return [
        body('NAME')
            .exists().withMessage('NAME parameter missing')
            .bail()
            .trim()
            .notEmpty().withMessage('NAME cannot be empty')
            .isLength({ min: 2, max: 100 }).withMessage('NAME length must be 2-100'),

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
            .isLength({ max: 500 }).withMessage('ADDRESS too long')
    ];
};


exports.validateUpdate = () => {
    return [

        body('ID')
            .exists().withMessage('ID parameter missing')
            .bail()
            .isInt().withMessage('ID should be number'),

        body('NAME')
            .optional()
            .trim()
            .notEmpty().withMessage('NAME cannot be empty')
            .isLength({ min: 2, max: 100 }),

        body('MOBILE')
            .optional()
            .trim()
            .isMobilePhone('en-IN').withMessage('Invalid mobile number'),

        body('STATUS')
            .optional()
            .isIn([0, 1]).withMessage('STATUS must be 0 or 1'),

        body('ADDRESS')
            .optional()
            .trim()
            .isLength({ max: 500 }),

        body('FIREBASE_REG_TOKEN')
            .optional()
            .trim()
    ];
};


exports.validateDelete = () => {
    return [
        body('ID')
            .exists().withMessage('ID parameter missing')
            .bail()
            .isInt().withMessage('ID should be number')
    ];
};

exports.get = async (req, res) => {

    let sortKey = req.body.sortKey ? req.body.sortKey : 'ID';
    let sortValue = req.body.sortValue ? req.body.sortValue : 'DESC';
    let filter = req.body.filter ? req.body.filter : '';

    var IS_FILTER_WRONG = mm.sanitizeFilter(filter);

    try {

        const allowedSortKeys = ['ID', 'EMPLOYEE_ID', 'NAME', 'EMAIL'];

        if (!allowedSortKeys.includes(sortKey)) {
            sortKey = 'ID';
        }

        if (!['ASC', 'DESC'].includes(sortValue.toUpperCase())) {
            sortValue = 'DESC';
        }

        if (IS_FILTER_WRONG) {

            return res.status(400).json({
                success: false,
                message: "Invalid filter parameter."
            });

        }

        const query =
            'SELECT * FROM employee_master WHERE 1=1 AND ARCHIVE=0 ' +
            (filter ? ' AND (' + filter + ')' : '') +
            ' ORDER BY ' + sortKey + ' ' + sortValue;

        const [result] = await pool.query(query);

        return res.status(200).json({
            success: true,
            message: 'Employee Data',
            data: result
        });

    } catch (error) {

        console.log(error);

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

}

exports.create = async (req, res) => {

    try {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg
            });
        }

        const data = getData(req);

        const [result] = await pool.query(
            `INSERT INTO employee_master 
            (NAME, MOBILE, STATUS, ADDRESS, FIREBASE_REG_TOKEN, ARCHIVE)
            VALUES (?, ?, ?, ?, ?, 0)`,
            [
                data.NAME,
                data.MOBILE,
                data.STATUS,
                data.ADDRESS,
                data.FIREBASE_REG_TOKEN
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Employee created successfully",
            data: {
                insertId: result.insertId
            }
        });

    } catch (error) {

        console.log(error);

        if (error.code === 'ER_DUP_ENTRY') {

            let field = "Record";

            if (error.sqlMessage.includes('MOBILE')) {
                field = "Mobile number";
            }

            if (error.sqlMessage.includes('EMAIL')) {
                field = "Email";
            }

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

    try {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg
            });
        }

        const id = req.body.ID;

        const allowedFields = [
            "NAME",
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

        const [result] = await pool.query(query, values);

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

        console.log(error);

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

    try {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg
            });
        }

        const id = req.body.ID;

        const [result] = await pool.query(
            `UPDATE employee_master SET ARCHIVE = 1 WHERE ID = ? AND ARCHIVE=0`,
            [id]
        );

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

        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });

    }

}