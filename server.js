const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');

const globalRoute = require('./routes/globalRoute');
const { authMiddleware } = require('./services/globalModule');

app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json({ limit: '50mb' }));

app.use(cors());

app.use('/static', express.static(path.join(__dirname, 'Uploads')));

// app.use(authMiddleware);
app.use('/api', globalRoute);

const PORT = process.env.SERVER_PORT || 6232;

app.listen(PORT, () => {
    console.log(`Server is live and listening on http://localhost:${PORT}/api`);
});