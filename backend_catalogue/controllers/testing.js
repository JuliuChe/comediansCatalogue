const router = require('express').Router()
const Artist = require('../models/artist')
const Play = require('../models/play')
const Theater = require('../models/theater')
const User = require('../models/user')

router.post('/reset', async (request, response) => {
  await Artist.deleteMany({})
  await Play.deleteMany({})
  await Theater.deleteMany({})
  await User.deleteMany({})
  response.status(204).end()
})

module.exports = router