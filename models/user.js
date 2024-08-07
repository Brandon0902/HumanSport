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
    photo: { type: String, default: 'default.jpg' }
});

// Método para generar un JWT (opcional)
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

UserSchema.methods.setImgUrl = function setimgurl(photo){
    this.photo = "http://localhost:3000" + photo;
}

const User = mongoose.model("User", UserSchema);

module.exports = User;
