const mongoose = require('mongoose')

mongoose.set('strictQuery', false)

const userSchema = mongoose.Schema({
  artistProfiles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref:'Artist', //The ref field specifies the name of the model being referenced
  }],
  username: {
    type: String,
    required: true,
    minLength: 3,
    unique: true,
    lowercase: true,
    trim: true
  },
  firstName:{
    type:String,
    required: true,
    trim : true},
  lastName:{
    type:String,
    required: true,
    trim : true},
  email:{
    type: String,
    required: true,
    minLength: 3,
    unique: true,
    lowercase: true,
    trim: true},
  passwordHash: {
     type: String,
    required: true
  } 
})

userSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
    delete returnedObject.passwordHash
  }
})

userSchema.index({ artistProfiles: 1 }, { unique: true, sparse: true })

const User =  mongoose.model('User', userSchema)

module.exports = User