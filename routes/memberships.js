const express = require('express');
const router = express.Router();
const mongoose = require("mongoose");
const autentifica = require("../middleware/autentificajwt"); 

const Membership = mongoose.model("Membership");
const { check, validationResult } = require('express-validator');

function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).send('Acceso denegado. No tienes permiso para esta acción.');
  }
  next();
}

/**
 * @swagger
 * tags:
 *   name: Memberships
 *   description: Operaciones relacionadas con membresías
 */

/**
 * @swagger
 * /memberships:
 *   get:
 *     summary: Obtener todas las membresías
 *     tags: [Memberships]
 *     responses:
 *       200:
 *         description: Lista de membresías
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Membership'
 *       500:
 *         description: Error del servidor
 */
router.get('/', async (req, res) => {
  try {
    const memberships = await Membership.find({});
    res.json(memberships);
  } catch (err) {
    res.status(500).send('Error al obtener las membresías');
  }
});

/**
 * @swagger
 * /memberships:
 *   post:
 *     summary: Crear una nueva membresía
 *     tags: [Memberships]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Membresía Básica
 *               description:
 *                 type: string
 *                 example: Descripción de la membresía básica
 *               price:
 *                 type: number
 *                 example: 99.99
 *               durationDays:
 *                 type: integer
 *                 example: 30
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 example: active
 *               payment:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     method:
 *                       type: string
 *                     status:
 *                       type: string
 *                     finished:
 *                       type: boolean
 *     responses:
 *       201:
 *         description: Membresía creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Membership'
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error del servidor
 */
router.post('/', autentifica, isAdmin, [
    check('name').notEmpty().withMessage('El nombre de la membresía es requerido'),
    check('description').notEmpty().withMessage('La descripción de la membresía es requerida'),
    check('price').isNumeric().withMessage('El precio debe ser un número'),
    check('durationDays').isInt({ gt: 0 }).withMessage('La duración en días debe ser un número positivo'),
    check('status').isIn(['active', 'inactive']).withMessage('Estado inválido, debe ser activo o inactivo')
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const membership = new Membership({
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      durationDays: req.body.durationDays,
      status: req.body.status,
      payment:req.body.payment.map(payment=>({
        name:payment.name,
        amount:payment.amount,
        method:payment.method,
        status:payment.status,
        finished:payment.finished
      }))
    });

    try {
      const savedMembership = await membership.save();
      res.status(201).json({ message: 'Membresía creada exitosamente', membership: savedMembership });
    } catch (err) {
      res.status(500).json({ message: 'Error al crear la membresía', error: err.toString() });
    }
  });

/**
 * @swagger
 * /memberships/update/{id}:
 *   patch:
 *     summary: Actualizar una membresía existente
 *     tags: [Memberships]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la membresía
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
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               durationDays:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Membresía actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Membership'
 *       400:
 *         description: Error de validación
 *       404:
 *         description: Membresía no encontrada
 *       500:
 *         description: Error del servidor
 */
router.patch('/update/:id', autentifica, isAdmin, [
    check('name').optional().isString().withMessage('El nombre de la membresía debe ser una cadena'),
    check('description').optional().isString().withMessage('La descripción de la membresía debe ser una cadena'),
    check('price').optional().isNumeric().withMessage('El precio debe ser un número'),
    check('durationDays').optional().isInt({ gt: 0 }).withMessage('La duración en días debe ser un número positivo'),
    check('status').optional().isIn(['active', 'inactive']).withMessage('Estado inválido, debe ser activo o inactivo')
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const updateFields = {
        name: req.body.name,
        description: req.body.description,
        price: req.body.price,
        durationDays: req.body.durationDays,
        status: req.body.status
      };

      const updatedMembership = await Membership.findByIdAndUpdate(req.params.id, updateFields, { new: true, runValidators: true });
      if (!updatedMembership) {
        return res.status(404).json({ message: 'Membresía no encontrada' });
      }
      res.status(200).json({ message: 'Membresía actualizada exitosamente', membership: updatedMembership });
    } catch (err) {
      res.status(500).json({ message: 'Error al actualizar la membresía', error: err.toString() });
    }
  });

/**
 * @swagger
 * /memberships/delete/{id}:
 *   delete:
 *     summary: Desactivar una membresía
 *     tags: [Memberships]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la membresía
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Membresía desactivada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Membership'
 *       404:
 *         description: Membresía no encontrada
 *       500:
 *         description: Error del servidor
 */
router.delete('/delete/:id', autentifica, isAdmin, async (req, res) => {
    try {
      const membership = await Membership.findById(req.params.id);
      if (!membership) {
        return res.status(404).json({ message: 'Membresía no encontrada' });
      }

      membership.status = 'inactive';
      await membership.save();
      res.status(200).json({ message: 'Membresía desactivada exitosamente', membership: membership });
    } catch (err) {
      res.status(500).json({ message: 'Error al desactivar la membresía', error: err.toString() });
    }
  });

module.exports = router;
