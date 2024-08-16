const express = require('express');
const router = express.Router();
const mongoose = require("mongoose");
const autentifica = require("../middleware/autentificajwt"); // Asegúrate de tener este middleware configurado

const Sensor = mongoose.model('Sensor');

// POST: Registrar un nuevo sensor (abierto a todos los usuarios autenticados)
router.post('/nuevo', autentifica, async (req, res) => {
    try {
        const { name, hora, lectura } = req.body;

        const nuevoSensor = new Sensor({
            name,
            hora,
            lectura
        });

        const sensorGuardado = await nuevoSensor.save();
        res.status(201).json(sensorGuardado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PATCH: Actualizar solo los campos especificados de un sensor (solo admin y recepcionist)
router.patch('/:id', autentifica, async (req, res) => {
    // Verificar si el usuario es administrador o recepcionist
    if (req.user.role !== "admin" && req.user.role !== "recepcionist") {
        return res.status(403).send("Acceso denegado. No tienes permiso para esta acción");
    }

    try {
        const actualizaciones = req.body; // Toma solo los campos enviados en el body

        const sensorActualizado = await Sensor.findByIdAndUpdate(
            req.params.id,
            actualizaciones,
            { new: true, runValidators: true }
        );

        if (!sensorActualizado) {
            return res.status(404).json({ message: 'Sensor no encontrado' });
        }

        res.json(sensorActualizado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE: Eliminar un sensor (solo admin y recepcionist)
router.delete('/eliminar/:id', autentifica, async (req, res) => {
    // Verificar si el usuario es administrador o recepcionist
    if (req.user.role !== "admin" && req.user.role !== "recepcionist") {
        return res.status(403).send("Acceso denegado. No tienes permiso para esta acción");
    }

    try {
        const sensorEliminado = await Sensor.findByIdAndDelete(req.params.id);

        if (!sensorEliminado) {
            return res.status(404).json({ message: 'Sensor no encontrado' });
        }

        res.json({ message: 'Sensor eliminado exitosamente' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// GET: Obtener el valor de un sensor (abierto a todos los usuarios autenticados)
router.get('/:id', async (req, res) => {
    try {
        const sensor = await Sensor.findById(req.params.id);

        if (!sensor) {
            return res.status(404).json({ message: 'Sensor no encontrado' });
        }

        res.json(sensor);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
