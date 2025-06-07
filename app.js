require('dotenv').config();
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

require('./models/connection');

var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth');
var authorsRouter = require('./routes/authors');
var articlesRouter = require('./routes/articles');
var backupRouter = require('./routes/backup');
var projectsRouter = require('./routes/projects');
var authorsStatsRouter = require('./routes/authors-stats');
var articlesStatsRouter = require('./routes/articles-stats'); 

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
app.use("/backup", backupRouter);
app.use("/projects", projectsRouter);
app.use("/authorstats", authorsStatsRouter); 
app.use("/articleStats", articlesStatsRouter); 

module.exports = app;