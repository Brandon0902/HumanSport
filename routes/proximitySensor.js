const express = require('express');
const router = express.Router();
const mongoose = require("mongoose");

const Sensor = mongoose.model('Sensor');


// POST: Registrar un nuevo sensor
router.post('/nuevo', async (req, res) => {
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

// PUT: Actualizar el valor de un sensor
router.put('/:id', async (req, res) => {
    try {
        const { hora, lectura } = req.body;

        const sensorActualizado = await Sensor.findByIdAndUpdate(
            req.params.id,
            { hora, lectura },
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

// DELETE: Eliminar un sensor
router.delete('/eliminar/:id', async (req, res) => {
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

// GET: Obtener el valor de un sensor
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
