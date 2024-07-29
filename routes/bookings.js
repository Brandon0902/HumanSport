const express = require('express');
const router = express.Router();
const mongoose = require("mongoose");
const { check, validationResult } = require('express-validator');

const Booking = mongoose.model("Booking");

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
 *     summary: Crea una nueva reserva
 *     tags: [Booking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Booking'
 *     responses:
 *       201:
 *         description: Reserva creada exitosamente
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error del servidor
 */
router.post('/', [
  check('user.*.firstName').notEmpty().withMessage('El nombre del usuario es requerido'),
  check('user.*.phone').notEmpty().withMessage('El teléfono del usuario es requerido'),
  check('course.*.name').notEmpty().withMessage('El nombre del curso es requerido'),
  check('course.*.description').notEmpty().withMessage('La descripción del curso es requerida'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const booking = new Booking({
    user: req.body.user,
    course: req.body.course,
    status: req.body.status || 'active',
    comments: req.body.comments || ''
  });

  try {
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
  check('user.*.firstName').optional().isString().withMessage('El nombre del usuario debe ser una cadena'),
  check('user.*.phone').optional().isString().withMessage('El teléfono del usuario debe ser una cadena'),
  check('course.*.name').optional().isString().withMessage('El nombre del curso debe ser una cadena'),
  check('course.*.description').optional().isString().withMessage('La descripción del curso debe ser una cadena'),
  check('status').optional().isIn(['active', 'deleted']).withMessage('El estado debe ser "active" o "deleted"'),
  check('comments').optional().isString().withMessage('Los comentarios deben ser una cadena'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const updateFields = {};
    if (req.body.user) updateFields.user = req.body.user;
    if (req.body.course) updateFields.course = req.body.course;
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
