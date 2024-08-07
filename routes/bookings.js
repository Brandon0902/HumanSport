const express = require('express');
const router = express.Router();
const mongoose = require("mongoose");
const { check, validationResult } = require('express-validator');
const autentifica = require("../middleware/autentificajwt")

const Booking = mongoose.model("Booking");
const Course = mongoose.model('Course');
const User = mongoose.model('User');

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       required:
 *         - user
 *         - course
 *       properties:
 *         user:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               phone:
 *                 type: string
 *         course:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *         status:
 *           type: string
 *           enum: ['active', 'deleted']
 *           default: 'active'
 *         comments:
 *           type: string
 */

/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: Obtiene todas las reservas
 *     tags: [Booking]
 *     responses:
 *       200:
 *         description: Lista de todas las reservas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Booking'
 */
router.get('/', async (req, res) => {
  try {
    const bookings = await Booking.find({});
    res.json(bookings);
  } catch (err) {
    res.status(500).send('Error al obtener las reservas');
  }
});

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Crea una nueva reserva (booking)
 *     tags: [Booking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                   phone:
 *                     type: string
 *               courseName:
 *                 type: string
 *                 description: El nombre del curso para la reserva
 *               comments:
 *                 type: string
 *     responses:
 *       201:
 *         description: Reserva creada exitosamente
 *       400:
 *         description: Error de validación
 *       404:
 *         description: Curso o usuario no encontrado
 *       500:
 *         description: Error del servidor
 */
router.post('/', autentifica, [
  check('user.firstName').notEmpty().withMessage('El nombre del usuario es requerido'),
  check('user.phone').notEmpty().withMessage('El teléfono del usuario es requerido'),
  check('courseName').notEmpty().withMessage('El nombre del curso es requerido'),
], async (req, res) => {

  const { user, courseName, comments } = req.body;

  try {
    // Buscar el usuario por nombre y teléfono
    const foundUser = await User.findOne({ firstName: user.firstName, phone: user.phone });
    if (!foundUser) {
      return res.status(404).json({ message: `Usuario con nombre ${user.firstName} y teléfono ${user.phone} no encontrado.` });
    }

    // Buscar el curso por nombre
    const course = await Course.findOne({ name: courseName });
    if (!course) {
      return res.status(404).json({ message: `Curso con nombre ${courseName} no encontrado.` });
    }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

    // Crear el nuevo booking con las referencias al usuario y curso
    const booking = new Booking({
      user: foundUser._id,
      course: course._id,
      status: 'active',
      comments: comments || ''
    });

    const savedBooking = await booking.save();
    res.status(201).json({ message: 'Reserva creada exitosamente', booking: savedBooking });
  } catch (err) {
    res.status(500).json({ message: 'Error al crear la reserva', error: err.toString() });
  }
});

/**
 * @swagger
 * /bookings/actualizar/{id}:
 *   patch:
 *     summary: Actualiza una reserva existente
 *     tags: [Booking]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la reserva a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Booking'
 *     responses:
 *       200:
 *         description: Reserva actualizada exitosamente
 *       400:
 *         description: Error de validación
 *       404:
 *         description: Reserva no encontrada
 *       500:
 *         description: Error del servidor
 */
router.patch('/actualizar/:id', [
  check('user.firstName').optional().isString().withMessage('El nombre del usuario debe ser una cadena'),
  check('user.phone').optional().isString().withMessage('El teléfono del usuario debe ser una cadena'),
  check('courseName').optional().isString().withMessage('El nombre del curso debe ser una cadena'),
  check('status').optional().isIn(['active', 'deleted']).withMessage('El estado debe ser "active" o "deleted"'),
  check('comments').optional().isString().withMessage('Los comentarios deben ser una cadena'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const updateFields = {};

    // Si se proporciona información del usuario, buscar el usuario y asignar el _id
    if (req.body.user) {
      const { firstName, phone } = req.body.user;
      const foundUser = await User.findOne({ firstName, phone });
      if (!foundUser) {
        return res.status(404).json({ message: `Usuario con nombre ${firstName} y teléfono ${phone} no encontrado.` });
      }
      updateFields.user = foundUser._id;
    }

    // Si se proporciona el nombre del curso, buscar el curso y asignar el _id
    if (req.body.courseName) {
      const course = await Course.findOne({ name: req.body.courseName });
      if (!course) {
        return res.status(404).json({ message: `Curso con nombre ${req.body.courseName} no encontrado.` });
      }
      updateFields.course = course._id;
    }

    if (req.body.status) updateFields.status = req.body.status;
    if (req.body.comments) updateFields.comments = req.body.comments;

    const updatedBooking = await Booking.findByIdAndUpdate(req.params.id, updateFields, { new: true, runValidators: true });
    if (!updatedBooking) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }
    res.status(200).json({ message: 'Reserva actualizada exitosamente', booking: updatedBooking });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar la reserva', error: err.toString() });
  }
});

/**
 * @swagger
 * /bookings/eliminar/{id}:
 *   delete:
 *     summary: Elimina una reserva
 *     tags: [Booking]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la reserva a eliminar
 *     responses:
 *       200:
 *         description: Reserva eliminada exitosamente
 *       404:
 *         description: Reserva no encontrada
 *       500:
 *         description: Error del servidor
 */
router.delete('/eliminar/:id', async (req, res) => {
  try {
    const deletedBooking = await Booking.findByIdAndDelete(req.params.id);
    if (!deletedBooking) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }
    res.status(200).json({ message: 'Reserva eliminada exitosamente', booking: deletedBooking });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar la reserva', error: err.toString() });
  }
});

module.exports = router;
