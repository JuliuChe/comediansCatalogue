const mongoose = require('mongoose')

mongoose.set('strictQuery', false)

const playSchema = mongoose.Schema({
  title: String,
  scriptEditor:String,
  author: String,
  theater: { type: mongoose.Schema.Types.ObjectId, ref: 'Theater' },
  director:    {
      type: mongoose.Schema.Types.ObjectId,
      ref:'Artist' //The ref field specifies the name of the model being referenced
    },
  artists: [{
    artist: { type: mongoose.Schema.Types.ObjectId, ref:'Artist' }, //The ref field specifies the name of the model being referenced
    personnage:String
  }],
  startDate: {
    type: Date,
    required: true
  },
  endDate:Date,
  url:String,
  likes:Number,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref:'User'
  }
})

playSchema.index({ director: 1 })
playSchema.index({ 'artists.artist': 1 })

playSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

playSchema.index({ startDate: -1, _id: -1 })

const Play =  mongoose.model('Play', playSchema)

module.exports = Play