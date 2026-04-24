const express = require('express')
const mongoose = require('mongoose')
const config = require('./utils/config')
const artistsRouter = require('./controllers/artists')
const playsRouter = require('./controllers/plays')
const usersRouter = require('./controllers/users')
const loginRouter = require('./controllers/login')
const logger = require('./utils/logger')
const middleware = require('./utils/middleware')

const app = express()

const mongoUrl = config.MONGODB_URI

mongoose
  .connect(mongoUrl, { family: 4 })
  .then(() => {
    logger.info('connected to MongoDB')
  })
  .catch((error) => {
    logger.error('error connection to MongoDB:', error.message)
  })

app.use(express.json())

app.use(middleware.requestLogger)
app.use(middleware.tokenExtractor)

app.use('/api/pieces', middleware.userExtractor, playsRouter)
app.use('/api/artists', middleware.userExtractor, artistsRouter)
// app.use('/api/theatres', middleware.userExtractor, theatresRouter)

app.use('/api/users', usersRouter)
app.use('/api/login', loginRouter)

if (process.env.NODE_ENV === 'test') {
  const testingRouter = require('./controllers/testing')
  app.use('/api/testing', testingRouter)
}


app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

module.exports = app