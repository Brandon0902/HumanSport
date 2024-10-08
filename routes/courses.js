const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const autentifica = require("../middleware/autentificajwt");
const jwt = require("jsonwebtoken");
const {  ObjectId } = require('mongodb');


const Course = mongoose.model("Course");
const Instructor = mongoose.model("Instructor");
const User = mongoose.model("User");

const { check, validationResult } = require("express-validator");

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
router.get("/", autentifica, async (req, res) => {
  try {
    let query = {};

    const status = req.query.status;

    if (status && status !== "all") {
      query.status = status;
    }

    let courses;

    // Instructores ven solo los cursos asignados a ellos
    const token = req.header("Authorization").replace("Bearer ", "");
    const decoded = jwt.decode(token);

    if (decoded.role === "instructor") {
      query.instructor = decoded.id;
      
    }

    // Administradores y usuarios ven todos los cursos
    courses = await Course.find(query).populate("instructor");

    res.json(courses);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error al obtener los cursos");
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
router.post(
  "/",
  autentifica,
  [
    check("name").notEmpty().withMessage("El nombre del curso es requerido"),
    check("description")
      .notEmpty()
      .withMessage("La descripción del curso es requerida"),
    check("capacity")
      .isInt({ gt: 0 })
      .withMessage("La capacidad debe ser un número positivo"),
  ],
  async (req, res) => {
    //console.log('Role:', req.user.role);

    // Verificar si el usuario es administrador
    if (req.user.role !== "admin" && req.user.role !== "recepcionist") {
      return res
        .status(403)
        .send("Acceso denegado no tienes permiso para esta acción");
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const course = new Course({
      name: req.body.name,
      description: req.body.description,
      capacity: req.body.capacity,
      status: "active",
      classDay: req.body.classDay.map((classDay) => ({
        day: classDay.day,
        time: classDay.time,
        startDate: classDay.startDate,
        endDate: classDay.endDate,
      })),
      instructor: req.body.instructor,
    });

    try {
      const savedCourse = await course.save();
      res
        .status(201)
        .json({ message: "Curso creado exitosamente", course: savedCourse });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error al crear el curso", error: err.toString() });
    }
  }
);

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
router.patch("/actualizar/:id", autentifica, async (req, res) => {
  const courseId = req.params.id;

  // Verificar si el usuario es administrador
  if (req.user.role !== "admin" && req.user.role !== "recepcionist") {
    return res
      .status(403)
      .send("Acceso denegado no tienes permiso para esta acción");
  }

  try {
    const updatedCourse = await Course.findByIdAndUpdate(courseId, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedCourse) {
      return res.status(404).json({ message: "Curso no encontrado" });
    }
    res.status(200).json({
      message: "Curso actualizado exitosamente",
      course: updatedCourse,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al actualizar el curso", error: err.toString() });
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
router.delete("/delete/:id", autentifica, async (req, res) => {
  const courseId = req.params.id;

  // Verificar si el usuario es administrador
  if (req.user.role !== "admin" && req.user.role !== "recepcionist") {
    return res
      .status(403)
      .send("Acceso denegado no tienes permiso para esta acción");
  }

  try {
    const deletedCourse = await Course.findByIdAndUpdate(
      courseId,
      { status: "inactive" },
      { new: true }
    );
    if (!deletedCourse) {
      return res.status(404).json({ message: "Curso no encontrado" });
    }
    res
      .status(200)
      .json({ message: "Curso eliminado exitosamente", course: deletedCourse });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error al eliminar el curso", error: err.toString() });
  }
});

// Obtener un curso por ID
router.get("/:id", autentifica, async (req, res, next) => {
  try {
    let course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).send("Curso no encontrado");
    }
    res.send(course);
  } catch (err) {
    next(err);
  }
});

//Edición del objeto entero PUT
router.put("/:id", autentifica, async (req, res, next) => {
  try {
    const { name, description, capacity } = req.body;

    // Actualizar el curso en la base de datos
    let course = await Course.findByIdAndUpdate(
      req.params.id,
      { name, description, capacity },
      { new: true, runValidators: true } // new: true devuelve el documento modificado, runValidators aplica las validaciones del esquema
    );

    if (!course) {
      return res.status(404).send("Curso no encontrado");
    }

    res.send(course);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
