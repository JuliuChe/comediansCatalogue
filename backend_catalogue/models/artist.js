const mongoose = require('mongoose')

mongoose.set('strictQuery', false)

const artistSchema = mongoose.Schema({
  firstName: {
    type:String,
    required: true,
    trim: true
  },
  lastName: {
    type:String,
    required: true,
    trim: true
  },
  dateOfBirth: Date,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref:'User'
  }
})

artistSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const Artist =  mongoose.model('Artist', artistSchema)

module.exports = Artist