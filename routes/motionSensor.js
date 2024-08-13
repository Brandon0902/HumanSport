const express = require('express');
const router = express.Router();
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const arduinoPort = "COM3";
const arduinoSerialPort = new SerialPort({ path: arduinoPort, baudRate: 115200 });
const parser = arduinoSerialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

let valorDistancia = "";

parser.on('data', function(data, err) {
    if (err) {
        return console.log(err);
    }
    console.log("Valor recibido:", data);
    valorDistancia = data.toString('utf8');
});

router.get('/', async (req, res) => {
    res.send({ valorDistancia });
});

router.get('/reanudar', async (req, res) => {
    arduinoSerialPort.resume();
    res.send({ valorDistancia });
});

router.get('/detener', async (req, res) => {
    arduinoSerialPort.pause();
    res.send({ msg: "cerrar" });
});

router.post('/', async (req, res) => {
    var distancia = new Sensor({
        fecha: req.body.fecha,
        hora: req.body.hora,
        lectura: valorDistancia
    });

    await distancia.save();
    res.status(201).send(distancia);
});

arduinoSerialPort.on('error', function(err) {
    if (err) {
        return console.log(err);
    }
});

module.exports = router;
