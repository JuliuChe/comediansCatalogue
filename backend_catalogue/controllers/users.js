const bcrypt = require('bcrypt')
const usersRouter = require('express').Router()
const User = require('../models/user')
const Artist = require('../models/artist')
const { notifyExistingPlaysForArtist } = require('../services/notifications')


usersRouter.post('/', async (request, response) => {
  const { username, firstName, lastName, email, dateOfBirth, password } = request.body
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
    dateOfBirth,
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

  const {addArtistId, removeArtistId, username, firstName, lastName, email, dateOfBirth} = request.body

  // SNAPSHOT avant mutation
  const oldArtistProfiles = user.artistProfiles.map(a => a.toString())

  if (addArtistId !== undefined) {
    const artist = await Artist.findById(addArtistId)
    if(!artist) return response.status(404).json({error:'artist id to add does not exist'})
    if(!user.artistProfiles.some(id => id.equals(addArtistId))) {
      if(user.artistProfiles.length>0){
        for (const alreadyPresentId of user.artistProfiles){
          let artistToEdit = await Artist.findById(alreadyPresentId)
          artistToEdit.alsoKnownAs.addToSet(addArtistId)
          artist.alsoKnownAs.addToSet(alreadyPresentId)
          await artistToEdit.save()
        }
        await artist.save()
      }
      user.artistProfiles.push(addArtistId)
    }
  } 
  
  if (removeArtistId !== undefined) {
    const artist = await Artist.findById(removeArtistId)
    if(!artist) return response.status(404).json({error:'artist id to remove does not exist'})
    if(user.artistProfiles.some(id => id.equals(removeArtistId))) {
      user.artistProfiles.pull(removeArtistId) 
      if(user.artistProfiles.length>0){
        for (const alreadyPresentId of user.artistProfiles){
          let artistToEdit = await Artist.findById(alreadyPresentId)
          artistToEdit.alsoKnownAs.pull(removeArtistId)
          artist.alsoKnownAs.pull(alreadyPresentId)
          await artistToEdit.save()
        }
      }
      await artist.save()
       
    } 
  }
  if (username !== undefined) user.username = username
  if (firstName !== undefined) user.firstName = firstName
  if (lastName !== undefined) user.lastName = lastName
  if (email !== undefined) user.email = email
  if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth

  const updatedUser = await user.save()
  
  if(addArtistId && !oldArtistProfiles.includes(addArtistId)){
    await notifyExistingPlaysForArtist(user._id, addArtistId)
  }
    
  response.json(updatedUser)
  
})

module.exports = usersRouter