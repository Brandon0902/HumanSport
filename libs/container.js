const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const storage = multerS3({
    s3: s3,
    bucket: 'human-sport',
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE, 
    key: function (req, file, cb) {
        cb(null, `profiles/${Date.now().toString()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

module.exports = upload;
