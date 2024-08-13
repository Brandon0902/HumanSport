const express = require('express');
const router = express.Router();
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const arduinoPort = "COM3";
const arduinoSerialPort = new SerialPort({ path: arduinoPort, baudRate: 115200 });
const parser = arduinoSerialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

let estadoMovimiento = "";

parser.on('data', function(data, err) {
    if (err) {
        return console.log(err);
    }
    console.log("Valor recibido:", data);
    estadoMovimiento = data.toString('utf8');
});

router.get('/', async (req, res) => {
    res.send({ estadoMovimiento });
});

router.get('/reanudar', async (req, res) => {
    arduinoSerialPort.resume();
    res.send({ estadoMovimiento });
});

router.get('/detener', async (req, res) => {
    arduinoSerialPort.pause();
    res.send({ msg: "cerrar" });
});

router.post('/', async (req, res) => {
    var movimiento = new Sensor({
        fecha: req.body.fecha,
        hora: req.body.hora,
        lectura: estadoMovimiento
    });

    await movimiento.save();
    res.status(201).send(movimiento);
});

arduinoSerialPort.on('error', function(err) {
    if (err) {
        return console.log(err);
    }
});

module.exports = router;
