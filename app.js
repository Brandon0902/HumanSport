var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require("cors");
require('dotenv').config();
const upload = require('./libs/container');
const setupSwagger = require('./swagger');  

const mongoose = require('mongoose');

const mongodbConnString = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@${process.env.CLUSTER_NAME}.jtkuw.mongodb.net/${process.env.DB_NAME}`

mongoose.connect(mongodbConnString)

mongoose.connection.on("error0", function(error){
  console.log("error en conexion", error);

});


mongoose.connection.on("open",function() {
console.log("se conecto de manera correcta");
});

// Listado de modelos
require("./models/user");
require("./models/instructor");
require("./models/course");
require("./models/membership");
require("./models/booking");
require("./models/payment");
require("./models/sensor");

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var instructorsRouter = require('./routes/instructors');
var coursesRouter = require('./routes/courses');
var membershipRouter = require('./routes/memberships');
var bookingsRouter = require('./routes/bookings');

var paymentsRouter = require('./routes/payments');
//var comandosRouter  = require('./routes/comandosBD');
var proximitySensorRouter = require('./routes/proximitySensor');

var app = express();

// Configuración de Swagger
setupSwagger(app);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use('/photo',express.static(__dirname + '/container/img'));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
//app.use(upload.array());
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors({
  "origin": ["http://localhost:4200","http://localhost:80"],
  "methods": "GET,PUT,POST,DELETE",
  "preflightContinue": false,
  "optionsSuccessStatus": 204
}));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/instructors', instructorsRouter);
app.use('/courses', coursesRouter);
app.use('/memberships', membershipRouter);
app.use('/bookings', bookingsRouter);
app.use('/payments', paymentsRouter);
app.use('/sensor', proximitySensorRouter);
//app.use('/comandos', comandosRouter);

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
