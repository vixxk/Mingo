const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();


app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}


app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'Mingo API');
  next();
});


app.use('/api', routes);


app.get('/', (req, res) => {
  res.json({
    name: 'Mingo API',
    version: '1.0.0',
    description: 'Connect with listeners via audio/video calls',
    docs: '/api/health',
  });
});


app.use(notFoundHandler);


app.use(errorHandler);

//Trial
module.exports = app;
