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

mongoose.connect('mongodb+srv://bran0902:Br%40nd0n0902.@cluster0.nmhbwa5.mongodb.net/GymApp?retryWrites=true&w=majority');

// Listado de modelos
require("./models/user");
require("./models/instructor");
require("./models/course");
require("./models/membership");
require("./models/booking");

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var instructorsRouter = require('./routes/instructors');
var coursesRouter = require('./routes/courses');
var membershipRouter = require('./routes/memberships');
var bookingsRouter = require('./routes/bookings');
var comandosRouter  = require('./routes/comandosBD');

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
app.use('/comandos', comandosRouter);

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
