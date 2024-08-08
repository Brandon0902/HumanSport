const express = require('express');
const router = express.Router();
const mongoose = require("mongoose");
const autentifica = require("../middleware/autentificajwt");  

const Course = mongoose.model("Course");
const Instructor = mongoose.model('Instructor');
const User = mongoose.model("User");

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
 *     summary: Obtiene todos los cursos o solo los cursos asignados al instructor logueado
 *     tags: [Course]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de cursos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 *       403:
 *         description: Acceso denegado. No estás autorizado para ver los cursos.
 *       404:
 *         description: Usuario o instructor no encontrado.
 *       500:
 *         description: Error al obtener los cursos.
 */
router.get('/', autentifica, async (req, res) => {
  try {
    let courses;

    // Instructores ven solo los cursos asignados a ellos
    if (req.user.role === 'instructor') {
      // Buscar el usuario logueado por email en la colección de usuarios
      const user = await User.findOne({ email: req.user.email });
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }

      // Usar el nombre del usuario para buscar en la colección de instructores
      const instructor = await Instructor.findOne({ name: user.firstName });
      if (!instructor) {
        return res.status(404).json({ message: 'Instructor no encontrado.' });
      }

      // Buscar cursos asignados al instructor encontrado
      courses = await Course.find({ instructor: instructor._id });
    } else {
      // Administradores y usuarios ven todos los cursos
      courses = await Course.find({});
    }

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
router.post('/', autentifica, [
  check('name').notEmpty().withMessage('El nombre del curso es requerido'),
  check('description').notEmpty().withMessage('La descripción del curso es requerida'),
  check('capacity').isInt({ gt: 0 }).withMessage('La capacidad debe ser un número positivo'),
], async (req, res) => {
  //console.log('Role:', req.user.role); 

  // Verificar si el usuario es administrador
  if (req.user.role !== 'admin') {
    return res.status(403).send('Acceso denegado no tienes permiso para esta acción');
  }

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
    instructor: req.body.instructor
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
router.patch('/actualizar/:id', autentifica, async (req, res) => {
  const courseId = req.params.id;

  // Verificar si el usuario es administrador
  if (req.user.role !== 'admin') {
    return res.status(403).send('Acceso denegado no tienes permiso para esta acción');
  }

  try {
    const updatedCourse = await Course.findByIdAndUpdate(courseId, req.body, { new: true, runValidators: true });
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
 *     summary: Elimina un curso existente
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
router.delete('/eliminar/:id', autentifica, async (req, res) => {
  const courseId = req.params.id;

  // Verificar si el usuario es administrador
  if (req.user.role !== 'admin') {
    return res.status(403).send('Acceso denegado no tienes permiso para esta acción');
  }

  try {
    const deletedCourse = await Course.findByIdAndUpdate(courseId, { status: 'deleted' }, { new: true });
    if (!deletedCourse) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }
    res.status(200).json({ message: 'Curso eliminado exitosamente', course: deletedCourse });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar el curso', error: err.toString() });
  }
});

module.exports = router;
