var express = require('express');
var router = express.Router();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");
const moment = require('moment');
const upload = require('../libs/container');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

let autentifica = require("../middleware/autentificajwt");

const Payment = mongoose.model('Payment');
const Membership = mongoose.model('Membership');
const User = mongoose.model("User");
const Booking = mongoose.model("Booking");

function isAdmin(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'recepcionist') {
    return res.status(403).send('Acceso denegado. No tienes permiso para esta acción.');
  }
  next();
}

function canRegisterUser(req, res, next) {
  const userRole = req.user.role;
  const newUserRole = req.body.role;

  if (userRole === 'admin') {
    // Admin puede registrar cualquier tipo de usuario
    return next();
  } else if (userRole === 'recepcionista') {
    // Recepcionista puede registrar cualquier usuario excepto 'admin' y 'recepcionista'
    if (newUserRole === 'admin' || newUserRole === 'recepcionista') {
      return res.status(403).send('Acceso denegado. No puedes registrar usuarios de tipo admin o recepcionista.');
    }
    return next();
  } else {
    // Otros roles no pueden registrar usuarios
    return res.status(403).send('Acceso denegado. No tienes permiso para esta acción.');
  }
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
    const role = req.query.role;
    let query = {};

    if (role) {
      query.role = role;
    }
    const status = req.query.status;

    if (status && status !== 'all') {
      query.status = status;
    }

    let users = await User.find(query);

    const usersWithMembershipInfo = [];

    for(const u of users) {
      usersWithMembershipInfo.push(
        {
          ...u.toJSON(),
          ...((u.role === 'member' && u.status === 'active') && {membershipInfo: await getUserMembership(u._id)})
          
        }
      )
    }

    res.send(usersWithMembershipInfo);
  } catch (err) {
    next(err);
  }
});

const getUserMembership = async (id) => {
  let user = await User.findById(id);
  if (!user) {
    return {status: false, message: 'Usuario no encontrado'}
  }
  const payment = await Payment.findOne({status: 'completed', userId: id}).sort({ updatedAt: -1 });

  if(!payment){
    return {status: false, message: 'Este miembro no cuenta con una membresía activa'}
  }

  const membership = await Membership.findById(payment.membershipId);
  const today = moment();
  const paymentDate = moment(payment.updatedAt);
  const daysElapsed = today.diff(paymentDate, 'days');

  const membershipStatus = daysElapsed <= membership.durationDays;

  const remaningDays = membership.durationDays - daysElapsed;
  const expirationDate = today.add(remaningDays, 'days');


  return {
    status: membershipStatus,
    message: membershipStatus ? 'Este miembro tiene una membresía activa' : 'Este miembro no cuenta con una membresía activa',
    ...(membershipStatus && {daysElapsed, remaningDays, expirationDate, membership, payment }),
  }
}

//Endpoint para obtener Membresía activa
router.get('/:id/memberships', autentifica, async(req, res, next)=> {
  try {
    res.send(await getUserMembership(req.params.id));
  } catch (err) {
    next(err);
  }
});

// Obtener un usuario por ID
router.get('/:id', autentifica, async (req, res, next) => {
  try {
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send('Usuario no encontrado');
    }
    let bookings = [];
    if(user.role === 'member'){
      bookings = await Booking.find({user: user._id, status: 'active'}).populate('course');
    }
    res.send({...user.toJSON(), ...(user.role === 'member' && {bookings})});
  } catch (err) {
    next(err);
  }
});

//Edición del objeto entero PUT
router.put('/:id', upload.single('photo'), autentifica, async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone } = req.body;

    // Busca al usuario por ID
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send('Usuario no encontrado');
    }

    // Actualiza los campos del usuario
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (phone) user.phone = phone;

    // Si se subió una nueva foto, actualiza el campo `photo`
    if (req.file && req.file.key) {
      const photoKey = req.file.key;
      user.setImgUrl(photoKey);  // Actualiza la URL de la imagen en S3
    }

    // Guarda los cambios en la base de datos
    await user.save();

    // Devuelve el usuario actualizado
    res.send(user);
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

    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(req.body.password, salt);

    let newUser = new User({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      birthdate: req.body.birthdate,
      phone: req.body.phone,
      role: req.body.role,
      password: encryptedPassword,
      photo: 'default.jpg', // Inicializa con una foto por defecto
      status: 'active'
    });

    // Si se subió una nueva foto, actualiza el campo `photo`
    if (req.file && req.file.key) {
      const photoKey = req.file.key;
      newUser.setImgUrl(photoKey);  // Actualiza la URL de la imagen en S3
    }

    // Guarda el nuevo usuario en la base de datos
    await newUser.save();

    // Devuelve el usuario creado
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
    return res.status(400).json({message:'Usuario o contraseña incorrectos'});
  }

  const isMatch = await bcrypt.compare(req.body.password, user.password);
  if (!isMatch) {
    return res.status(400).json({message:'Usuario o contraseña incorrectos'});
  }

  let usuarioAutenticado = {
    message: "Bienvenido",
    email: user.email,
    jwtoken: user.generateJWT(),
    ...user.toJSON() //Retorna los datos del usuario en el login
  };

  res.send({ usuarioAutenticado });
});
/*esta es una prueba*/
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
router.put("/pass", autentifica, canRegisterUser, [
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
/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Actualizar un usuario existente
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 60d21b4667d0d8992e610c85
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
 *               phone:
 *                 type: string
 *                 example: 123456789
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Error de validación
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error del servidor
 */
router.put('/:id', upload.single('photo'), autentifica, async (req, res, next) => {
  try {
      const { firstName, lastName, email, phone } = req.body;

      // Busca al usuario por ID
      let user = await User.findById(req.params.id);
      if (!user) {
          return res.status(404).send('Usuario no encontrado');
      }

      // Actualiza los campos del usuario
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (email) user.email = email;
      if (phone) user.phone = phone;

      // Si se subió una nueva foto, actualiza el campo `photo`
      if (req.file) {
          user.setImgUrl(req.file.key);  // Actualiza la URL de la imagen en S3
      }

      // Guarda los cambios en la base de datos
      await user.save();

      // Devuelve el usuario actualizado
      res.send(user);
  } catch (err) {
      next(err);
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
    let user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive',  },
      { new: true, runValidators: true } // new: true devuelve el documento modificado, runValidators aplica las validaciones del esquema
    );

    res.send({ user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
