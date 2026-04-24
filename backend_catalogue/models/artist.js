const mongoose = require('mongoose')

mongoose.set('strictQuery', false)

const artistSchema = mongoose.Schema({
  firstName: String,
  lastName: String,
  birthDate: Date,
  plays: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref:'Play' //The ref field specifies the name of the model being referenced
    }
  ],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref:'User'
  }
})

blogSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const Artist =  mongoose.model('Artist', ArtistSchema)

module.exports = Artist