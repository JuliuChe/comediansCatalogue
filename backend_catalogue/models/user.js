const mongoose = require('mongoose')

mongoose.set('strictQuery', false)

const userSchema = mongoose.Schema({
  artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref:'Artist' //The ref field specifies the name of the model being referenced
  },
  username: {
    type: String,
    required: true,
    minLength: 3,
    unique: true
  },
  role: {
    type: String,
    enum: ['artist', 'agent', 'admin'],
    default: 'artist'  // tous vos users actuels seront des artists
  },
  name:String,
  passwordHash:String
})

userSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
    delete returnedObject.passwordHash
  }
})

const User =  mongoose.model('User', userSchema)

module.exports = User