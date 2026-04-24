const mongoose = require('mongoose')

mongoose.set('strictQuery', false)

const playSchema = mongoose.Schema({
  title: String,
  scriptEditor:String,
  author: String,
  likes:Number,
  director:    {
      type: mongoose.Schema.Types.ObjectId,
      ref:'Artist' //The ref field specifies the name of the model being referenced
    },
  url:String,
  theater: { type: mongoose.Schema.Types.ObjectId, ref: 'Theater' },
  startDate: Date,
  endDate:Date,
  artists: [{
    artist: { type: mongoose.Schema.Types.ObjectId, ref:'Artist' }, //The ref field specifies the name of the model being referenced
    role: {
      type:String,
      enum: ['comedien', 'metteur_en_scene'],
      required:true
    },
    personnage:String
  }],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref:'User'
  }
})

playSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const Play =  mongoose.model('Play', playSchema)

module.exports = Play