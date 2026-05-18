const bcrypt = require('bcrypt')
const usersRouter = require('express').Router()
const User = require('../models/user')
const Artist = require('../models/artist')
const { notifyExistingPlaysForArtist } = require('../services/notifications')


usersRouter.post('/', async (request, response) => {
  const { username, firstName, lastName, email, password } = request.body
  if(!password || password.trim().length<3){
    return response.status(422).json({ error : 'password with at least 3 characters required' })
  }
  const saltRounds = 10
  const passwordHash = await bcrypt.hash(password, saltRounds)

  const user = new User({
    username,
    firstName,
    lastName,
    email,
    passwordHash
  })

  const savedUser = await user.save()

  response.status(201).json(savedUser)
})

usersRouter.patch('/me', async (request, response) => {
  const userId= request.user
  if (!userId) return response.status(401).json({error:'token invalid'})
  
  const user = await User.findById(userId)
  if (!user) return response.status(404).json({error:'user does not exist'})

  const {artistId, username, firstName, lastName, email} = request.body

  // SNAPSHOT avant mutation
  const oldArtistProfile = user.artistProfile

  if (artistId !== undefined) {
    const artist = await Artist.findById(artistId)
    if(!artist) return response.status(404).json({error:'artist id does not exist'})
    user.artistProfile = artistId
  }
  if (username !== undefined) user.username = username
  if (firstName !== undefined) user.firstName = firstName
  if (lastName !== undefined) user.lastName = lastName
  if (email !== undefined) user.email = email

  const updatedUser = await user.save()

  const oldId = oldArtistProfile?.toString() ?? null
  const newId = user.artistProfile?.toString() ?? null
  if (newId && newId !== oldId) {
    await notifyExistingPlaysForArtist(user._id, user.artistProfile)
  }

  response.json(updatedUser)
  
})

module.exports = usersRouter