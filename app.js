require('dotenv').config();
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require('./models/connection');

var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth');
var authorsRouter = require('./routes/authors')
var articlesRouter = require('./routes/articles')
var backupRouter = require('./routes/backup')

var app = express();
const cors = require('cors');
app.use(cors());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/authors', authorsRouter);
app.use("/articles", articlesRouter);
app.use("/backup", backupRouter)

module.exports = app;
