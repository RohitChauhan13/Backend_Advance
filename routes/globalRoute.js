const express = require('express');
const router = express.Router();

router.use('/employee', require('./employeeRoutes'));

module.exports = router;