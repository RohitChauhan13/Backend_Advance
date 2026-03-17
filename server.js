require('dotenv').config({ quiet: true });
const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const globalRoute = require('./routes/globalRoute');
const { authMiddleware } = require('./services/globalModule');
const limiter = require('./services/limiter.js');

app.set('trust proxy', 1);

app.use(helmet());
app.use(morgan('dev'));
app.use(compression());
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json({ limit: '50mb' }));
app.use(cors());
app.use('/static', express.static(path.join(__dirname, 'Uploads')));

app.use(limiter);       
// app.use(authMiddleware); 
app.use('/api', globalRoute);

const PORT = process.env.SERVER_PORT || 6232;
app.listen(PORT, () => {
    console.log(`Server is live and listening on http://localhost:${PORT}/api`);
});