const mongoose = require('mongoose');

const SensorSchema = new mongoose.Schema({
    fecha: {
        type: Date,
        required: true,
        default: Date.now
    },
    hora: {
        type: String,
        required: true
    },
    lectura: {
        type: String,
        required: true,
        enum: ['Movimiento detectado', 'No se detecta movimiento']
    }
});

const Sensor = mongoose.model('Sensor', SensorSchema);

module.exports = Sensor;