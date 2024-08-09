const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); 
const { check, validationResult } = require('express-validator');
const autentifica = require("../middleware/autentificajwt"); 

const Instructor = mongoose.model('Instructor');

function isAdmin(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'recepcionist') {
    return res.status(403).send('Acceso denegado. No tienes permiso para esta acción.');
  }
  next();
}

/**
 * @swagger
 * tags:
 *   name: Instructors
 *   description: Operaciones relacionadas con instructores
 */

/**
 * @swagger
 * /instructors:
 *   get:
 *     summary: Obtener todos los instructores
 *     tags: [Instructors]
 *     responses:
 *       200:
 *         description: Lista de instructores
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Instructor'
 *       500:
 *         description: Error del servidor
 */
router.get('/', autentifica, isAdmin, async (req, res) => {
  try {
    const instructors = await Instructor.find({});
    res.json(instructors);
  } catch (err) {
    res.status(500).send('Error al obtener los instructores');
  }
});

/**
 * @swagger
 * /instructors/{id}:
 *   get:
 *     summary: Obtener un instructor por ID
 *     tags: [Instructors]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del instructor
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Instructor encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Instructor'
 *       404:
 *         description: Instructor no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', autentifica, isAdmin, async (req, res) => {
  try {
    const instructor = await Instructor.findById(req.params.id);
    if (!instructor) {
      return res.status(404).json({ message: 'Instructor no encontrado' });
    }
    res.json(instructor);
  } catch (err) {
    res.status(500).send('Error al obtener el instructor');
  }
});

/**
 * @swagger
 * /instructors:
 *   post:
 *     summary: Crear un nuevo instructor
 *     tags: [Instructors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Juan Pérez
 *               speciality:
 *                 type: string
 *                 example: Matemáticas
 *               birthdate:
 *                 type: string
 *                 format: date
 *                 example: 1980-01-01
 *     responses:
 *       201:
 *         description: Instructor creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Instructor'
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error del servidor
 */
router.post('/', autentifica, isAdmin,[
  check('name').notEmpty().withMessage('El nombre del instructor es requerido'),
  check('speciality').notEmpty().withMessage('La especialidad del instructor es requerida'),
  check('birthdate').isDate().withMessage('La fecha de nacimiento es requerida y debe ser válida')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const instructor = new Instructor({
    name: req.body.name,
    speciality: req.body.speciality,
    birthdate: req.body.birthdate
  });

  try {
    const savedInstructor = await instructor.save();
    res.status(201).json({ message: 'Instructor creado exitosamente', instructor: savedInstructor });
  } catch (err) {
    res.status(500).json({ message: 'Error al crear el instructor', error: err.toString() });
  }
});

/**
 * @swagger
 * /instructors/{id}:
 *   patch:
 *     summary: Actualizar un instructor existente
 *     tags: [Instructors]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del instructor
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               speciality:
 *                 type: string
 *               birthdate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Instructor actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Instructor'
 *       400:
 *         description: Error de validación
 *       404:
 *         description: Instructor no encontrado
 *       500:
 *         description: Error del servidor
 */
router.patch('/:id', autentifica, isAdmin,[
  check('name').optional().isString().withMessage('El nombre del instructor debe ser una cadena'),
  check('speciality').optional().isString().withMessage('La especialidad del instructor debe ser una cadena'),
  check('birthdate').optional().isDate().withMessage('La fecha de nacimiento debe ser válida')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const updateFields = {};
    if (req.body.name) updateFields.name = req.body.name;
    if (req.body.speciality) updateFields.speciality = req.body.speciality;
    if (req.body.birthdate) updateFields.birthdate = req.body.birthdate;

    const updatedInstructor = await Instructor.findByIdAndUpdate(req.params.id, updateFields, { new: true, runValidators: true });
    if (!updatedInstructor) {
      return res.status(404).json({ message: 'Instructor no encontrado' });
    }
    res.status(200).json({ message: 'Instructor actualizado exitosamente', instructor: updatedInstructor });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar el instructor', error: err.toString() });
  }
});

/**
 * @swagger
 * /instructors/{id}:
 *   delete:
 *     summary: Eliminar un instructor
 *     tags: [Instructors]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del instructor
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Instructor eliminado exitosamente
 *       404:
 *         description: Instructor no encontrado
 *       500:
 *         description: Error del servidor
 */
router.delete('/:id', autentifica, isAdmin, async (req, res) => {
  try {
    const deletedInstructor = await Instructor.findByIdAndDelete(req.params.id);
    if (!deletedInstructor) {
      return res.status(404).json({ message: 'Instructor no encontrado' });
    }
    res.status(200).json({ message: 'Instructor eliminado exitosamente', instructor: deletedInstructor });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar el instructor', error: err.toString() });
  }
});

module.exports = router;
