const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const UserSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    birthdate: { type: Date, required: true },
    phone: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user', 'instructor', 'member', 'recepcionist'], default: 'user' },
    password: { type: String, required: true },
    photo: { type: String, default: 'default.jpg' },
    status: { type: String, default: 'active', enum: ['active', 'inactive'], required: true },
});

UserSchema.methods.generateJWT = function() {
    return jwt.sign(
        {
            id: this._id,
            email: this.email,
            role: this.role
        }, 
        process.env.JWT_SECRET,
        { expiresIn: '3h' }
    );
};

UserSchema.methods.setImgUrl = function setImgUrl(photoKey) {
    this.photo = `https://human-sport.s3.us-east-2.amazonaws.com/${photoKey}`;
};

const User = mongoose.model("User", UserSchema);

module.exports = User;
