const express = require('express');
const router = express.Router();

const employee = require('../services/employee');

router.post('/get', employee.get);

router.post(
    '/create',
    employee.validate(),
    employee.create
);

router.put(
    '/update',
    employee.validateUpdate(),
    employee.update
);

router.put(
    '/delete',
    employee.validateDelete(),
    employee.delete
);

module.exports = router;