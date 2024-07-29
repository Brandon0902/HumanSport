const jwt = require('jsonwebtoken');

function autentifica(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).send('Access Denied. You need a token.');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).send('Access Denied. No token provided.');
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        next();
    } catch (error) {
        res.status(403).send('Access Denied. Invalid token.');
    }
}

module.exports = autentifica