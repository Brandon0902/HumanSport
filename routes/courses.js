const express = require('express');
const router = express.Router();
const mongoose = require("mongoose");

const Course = mongoose.model("Course");
const { check, validationResult } = require('express-validator');

/**
 * @swagger
 * components:
 *   schemas:
 *     Course:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - capacity
 *       properties:
 *         name:
 *           type: string
 *           description: El nombre del curso
 *         description:
 *           type: string
 *           description: Una breve descripción del curso
 *         capacity:
 *           type: integer
 *           description: La capacidad del curso, debe ser un número positivo
 *         status:
 *           type: string
 *           enum: ['active', 'deleted']
 *           default: 'active'
 *         classDay:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               day:
 *                 type: string
 *               time:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *         instructor:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 */

/**
 * @swagger
 * /courses:
 *   get:
 *     summary: Obtiene todos los cursos
 *     tags: [Course]
 *     responses:
 *       200:
 *         description: Lista de todos los cursos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 */
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find({});
    res.json(courses);
  } catch (err) {
    res.status(500).send('Error al obtener los cursos');
  }
});

/**
 * @swagger
 * /courses:
 *   post:
 *     summary: Crea un nuevo curso
 *     tags: [Course]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Course'
 *     responses:
 *       201:
 *         description: Curso creado exitosamente
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error del servidor
 */
router.post('/', [
  check('name').notEmpty().withMessage('El nombre del curso es requerido'),
  check('description').notEmpty().withMessage('La descripción del curso es requerida'),
  check('capacity').isInt({ gt: 0 }).withMessage('La capacidad debe ser un número positivo'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const course = new Course({
    name: req.body.name,
    description: req.body.description,
    capacity: req.body.capacity,
    status: 'active',
    classDay: req.body.classDay.map(classDay => ({
      day: classDay.day,
      time: classDay.time,
      startDate: classDay.startDate,
      endDate: classDay.endDate
    })),
    instructor: req.body.instructor.map(instructor => ({
      name: instructor.name
    }))
  });

  try {
    const savedCourse = await course.save();
    res.status(201).json({ message: 'Curso creado exitosamente', course: savedCourse });
  } catch (err) {
    res.status(500).json({ message: 'Error al crear el curso', error: err.toString() });
  }
});

/**
 * @swagger
 * /courses/actualizar/{id}:
 *   patch:
 *     summary: Actualiza un curso existente
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del curso a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Course'
 *     responses:
 *       200:
 *         description: Curso actualizado exitosamente
 *       400:
 *         description: Error de validación
 *       404:
 *         description: Curso no encontrado
 *       500:
 *         description: Error del servidor
 */
router.patch('/actualizar/:id', [
  check('name').optional().isString().withMessage('El nombre del curso debe ser una cadena'),
  check('description').optional().isString().withMessage('La descripción del curso debe ser una cadena'),
  check('capacity').optional().isInt({ gt: 0 }).withMessage('La capacidad debe ser un número positivo')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const updateFields = {};
    if (req.body.name) updateFields.name = req.body.name;
    if (req.body.description) updateFields.description = req.body.description;
    if (req.body.capacity) updateFields.capacity = req.body.capacity;

    const updatedCourse = await Course.findByIdAndUpdate(req.params.id, updateFields, { new: true, runValidators: true });
    if (!updatedCourse) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }
    res.status(200).json({ message: 'Curso actualizado exitosamente', course: updatedCourse });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar el curso', error: err.toString() });
  }
});

/**
 * @swagger
 * /courses/eliminar/{id}:
 *   delete:
 *     summary: Elimina un curso
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del curso a eliminar
 *     responses:
 *       200:
 *         description: Curso eliminado exitosamente
 *       404:
 *         description: Curso no encontrado
 *       500:
 *         description: Error del servidor
 */
router.delete('/eliminar/:id', async (req, res) => {
  try {
    const deletedCourse = await Course.findByIdAndDelete(req.params.id);
    if (!deletedCourse) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }
    res.status(200).json({ message: 'Curso eliminado exitosamente', course: deletedCourse });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar el curso', error: err.toString() });
  }
});

module.exports = router;
