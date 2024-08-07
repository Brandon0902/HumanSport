var express = require('express');
var router = express.Router();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");
const moment = require('moment');
const upload = require ('../libs/container');
const validator = require('validator');
const fs = require('fs-extra');
const path = require('path');


let autentifica = require("../middleware/autentificajwt");


const User = mongoose.model("User");

function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).send('Acceso denegado. No tienes permiso para esta acción.');
  }
  next();
}



// Validaciones para el cuerpo de la solicitud
const validations = [
  body("firstName", "El campo nombre esta vacio").not().isEmpty().isString(),
  body("lastName", "El campo nombre").not().isEmpty().isString(),
  body("email").isEmail().withMessage("Tiene que ser un email"),
  body("birthdate").custom(async (value, { req }) => {
    const transformedDate = moment(value, "D de MMMM", true).format();
    if (!transformedDate) {
      throw new Error("Birthdate is invalid");
    }
    req.body.birthdate = transformedDate;
    return true;
  }),
  body("phone").isString().withMessage("Phone must be a string"),
  body("role").isString().withMessage("Role must be a string"),
  body("password")
    .isStrongPassword({ 
      //LA VALIDACIÓN DE LA PASSWORD VA AQUI
      minLength: 5,
      minLowercase: 1,
      minNumber: 1,
      minSymbols: 1,
      minUppercase: 1,
    })
    .withMessage("Invalid Password"),
];

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Operaciones relacionadas con usuarios
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Obtener todos los usuarios
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Error del servidor
 */
router.get('/', autentifica, async(req, res, next)=> {
  try {
    let users = await User.find({});
    res.send(users);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Crear un nuevo usuario
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Juan
 *               lastName:
 *                 type: string
 *                 example: Pérez
 *               email:
 *                 type: string
 *                 format: email
 *                 example: juan.perez@example.com
 *               birthdate:
 *                 type: string
 *                 format: date
 *                 example: 15 de agosto de 1990
 *               phone:
 *                 type: string
 *                 example: 123456789
 *               role:
 *                 type: string
 *                 example: user
 *               password:
 *                 type: string
 *                 example: $2b$10$kU8G4q9qVw7C2d7pAe8HPO5.CGzVfnXyJfoOpEAhE/f60PqTtG1G6
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error del servidor
 */
router.post('/', upload.single('photo'), validations, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let photoPath = req.file? `/photo/${req.file.filename}` : 'default.jpg'; 

    salt = await bcrypt.genSalt(10);
    encrypted = await bcrypt.hash(req.body.password, salt);

    let newUser = new User({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      birthdate: req.body.birthdate,
      phone: req.body.phone,
      role: req.body.role,
      password: encrypted,
      photo:  photoPath 
    });

    newUser.setImgUrl(photoPath);

    await newUser.save();
    res.status(201).send({ newUser });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: juan.perez@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Usuario autenticado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Bienvenido
 *                 email:
 *                   type: string
 *                   example: juan.perez@example.com
 *                 jwtoken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
 *       400:
 *         description: Error de autenticación
 */
router.post("/login", [
  body("email").isEmail().withMessage("El usuario debe ser un email"),
  body("password")
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send({ errores: errors.array() });
  }

  let user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(400).send("Usuario o contraseña incorrectos");
  }

  const isMatch = await bcrypt.compare(req.body.password, user.password);
  if (!isMatch) {
    return res.status(400).send("Usuario o contraseña incorrectos");
  }

  let usuarioAutenticado = {
    message: "Bienvenido",
    email: user.email,
    jwtoken: user.generateJWT(),
    ...user.toJSON() //Retorna los datos del usuario en el login
  };

  res.send({ usuarioAutenticado });
});

/**
 * @swagger
 * /users/pass:
 *   put:
 *     summary: Cambiar la contraseña del usuario
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: juan.perez@example.com
 *               password:
 *                 type: string
 *                 example: NewPassword123
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userUpdate:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Error de validación o usuario no encontrado
 *       500:
 *         description: Error del servidor
 */
router.put("/pass", autentifica, isAdmin, [
  body("email").isEmail(),
  body("password").isStrongPassword({minLength:5,
                                   minLowercase:1,
                                   minNumber:1,
                                   minSymbols:1,
                                   minUppercase:1       
})
], async (req,res)=>{
  let error = validationResult(req);
  if(!error.isEmpty()){
    return res.status(400).send({errores: error.array()})
  }  

  let user= await User.findOne({ email: req.body.email });

  if (!user) {
    return res.status(400).send("Usuario no encontrado"); 
  }

  salt = await bcrypt.genSalt(10);
  encrypted = await bcrypt.hash(req.body.password, salt);

  let userUpdate = await User.findOneAndUpdate(
    { email: req.body.email },
    {
      password: encrypted,
      role: req.body.role
    },
    { new: true }, // Esta opción devuelve el documento modificado
  );

  res.send({ userUpdate })
});

/**
 * @swagger
 * /users/update/email:
 *   patch:
 *     summary: Actualizar información del usuario por email
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: juan.perez@example.com
 *               firstName:
 *                 type: string
 *                 example: Juan
 *               lastName:
 *                 type: string
 *                 example: Pérez
 *               birthdate:
 *                 type: string
 *                 format: date
 *                 example: 15 de agosto de 1990
 *               phone:
 *                 type: string
 *                 example: 123456789
 *               role:
 *                 type: string
 *                 example: user
 *               photo:
 *                 type: string
 *                 example: /photo/filename.jpg
 *     responses:
 *       200:
 *         description: Información del usuario actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Error de validación o usuario no encontrado
 *       500:
 *         description: Error del servidor
 */
router.patch('/update/email', autentifica, isAdmin, [
  body("email").isEmail().withMessage("Debe ser un correo electrónico válido"),
  body("firstName").optional().isString().withMessage("Debe ser una cadena de texto"),
  body("lastName").optional().isString().withMessage("Debe ser una cadena de texto"),
  body("birthdate").optional().custom((value, { req }) => {
    const transformedDate = moment(value, "D de MMMM", true).format();
    if (!transformedDate) {
      return "La fecha de nacimiento es inválida";
    }
    req.body.birthdate = transformedDate;
    return true;
  }),
  body("phone").optional().isString().withMessage("Debe ser una cadena de texto"),
  body("role").optional().isString().withMessage("Debe ser una cadena de texto"),
  body("photo").optional().isString().withMessage("Debe ser una cadena de texto")
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    let user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).send("Usuario no encontrado");
    }

    // Actualizar solo los campos que han sido enviados en la solicitud
    const updatedFields = {};
    Object.keys(req.body).forEach(key => {
      if (key!== 'email') { // Excluir el campo email ya que se usa para buscar
        updatedFields[key] = req.body[key];
      }
    });

    // Aplicar los cambios solo a los campos actualizados
    const updatedUser = await User.findOneAndUpdate(
      { email: req.body.email },
      { $set: updatedFields },
      { new: true }
    );

    res.send({ updatedUser });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

/**
 * @swagger
 * /users/delete/{email}:
 *   delete:
 *     summary: Eliminar un usuario por email
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *           example: juan.perez@example.com
 *     responses:
 *       200:
 *         description: Usuario eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error del servidor
 */
router.delete('/delete/:email', autentifica, isAdmin, async (req, res, next) => {
  try {
    let user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(400).send("User not found");
    }

    let deletedUser = await User.findOneAndDelete({ email: req.params.email });
    res.send({ deletedUser });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
