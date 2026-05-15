const logger = require('./logger')
const jwt = require('jsonwebtoken')


const requestLogger = (request, response, next) => {
  logger.info('Method:', request.method)
  logger.info('Path:  ', request.path)
  logger.info('Body:  ', request.body)
  logger.info('---')
  next()
}

const tokenExtractor = (request, response, next) => {
  
  const authorization=request.get('authorization')
  console.log(authorization)
  if (authorization && authorization.startsWith('Bearer ')){
    request.token = authorization.replace('Bearer ','')
  }
  next()
}

const userExtractor = (request, response, next) => {
  if(request.token){
    const decodedToken = jwt.verify(request.token, process.env.SECRET)

    if(!decodedToken.id){
      console.log(decodedToken)
      return response.status(401).json({ error:'token invalid' })
    }

    request.user = decodedToken.id
  }

  next()
}

const paginationMiddleware = ({ maxLimit = 200, defaultLimit = 50 } = {}) => {
  return (req, res, next) => {
    // Validation de limit
    let limit
    if (req.query.limit !== undefined) {
      limit = parseInt(req.query.limit, 10)
      if (Number.isNaN(limit) || limit < 1) {
        return res.status(400).json({ error: 'Invalid limit' })
      }
      limit = Math.min(limit, maxLimit)
    } else {
      limit = defaultLimit
    }

    // Validation du cursor
    const cursor = req.query.cursor
    if (cursor !== undefined && (typeof cursor !== 'string' || cursor.length > 500)) {
      return res.status(400).json({ error: 'Invalid cursor' })
    }

    req.pagination = { limit, cursor: cursor || null }
    next()
  }
}

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

const errorHandler = (error, request, response, next) => {
  logger.error(error.message)

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' })
  } else if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message })
  } else if (error.name === 'MongoServerError' && error.message.includes('E11000 duplicate key error')) {
    return response.status(400).json({ error: 'expected `username` to be unique' })
  } else if (error.name ===  'JsonWebTokenError') {
    return response.status(401).json({ error: 'token invalid' })
  }

  next(error)
}

module.exports = {
  unknownEndpoint,
  errorHandler,
  requestLogger,
  tokenExtractor,
  userExtractor,
  paginationMiddleware
}