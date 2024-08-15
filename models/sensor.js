const mongoose = require('mongoose');

const SensorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,  
    },
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
        enum: ['Alarma activada', 'Alarma desactivada', 'Puerta bloqueada'], 
        default: 'Alarma activada'
    }
});

const Sensor = mongoose.model('Sensor', SensorSchema);

module.exports = Sensor;
