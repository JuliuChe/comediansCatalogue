const bcrypt = require('bcrypt')
const usersRouter = require('express').Router()
const User = require('../models/user')

usersRouter.post('/', async (request, response) => {
  const { username, name, password } = request.body
  if(!password || password.trim().length<3){
    return response.status(422).json({ error : 'password with at least 3 characters required' })
  }
  const saltRounds = 10
  const passwordHash = await bcrypt.hash(password, saltRounds)

  const user = new User({
    username,
    name,
    passwordHash
  })

  const savedUser = await user.save()

  response.status(201).json(savedUser)

})

usersRouter.get('/', async (request, response) => {  
  const users = await User
    .find({})
    .populate(
      {path:'artist',
      select:'firstName lastName plays',
      populate: {
        path:'plays',
        select:'title author startDate endDate theater',
        populate: {
          path:'theater',
          select:'name'
        }
      }
    })

  response.status(200).json(users)
})

module.exports = usersRouter