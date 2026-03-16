const rateLimiter = require('express-rate-limit');

const limiter = rateLimiter.rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100, // single IP 100 request per 15 min
    message: {
        status: 429,
        message: "Too many requests, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false
})

module.exports = limiter;