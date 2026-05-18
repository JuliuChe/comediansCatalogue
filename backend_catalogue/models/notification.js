const mongoose = require('mongoose')

mongoose.set('strictQuery', false)

const notificationSchema = mongoose.Schema({
  recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref:'User',
      required:true
    },        // le destinataire connecté
  type: {
    type:String,
    enum:['cast_added'],
    required:true
  },     // permet d'autres types plus tard
  play: {
      type: mongoose.Schema.Types.ObjectId,
      ref:'Play',
      required:true
    },
  artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref:'Artist',
      required:true
    },         // utile si un user gère plusieurs profils un jour
  role:{
    type:String,
    enum:['cast', 'director'],
    required:true
  },
  status: {
    type : String,
    enum:['pending', 'accepted', 'rejected', 'withdrawn'],
    default:'pending'
  }},
  {timestamps: true})

notificationSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

notificationSchema.index({ recipient: 1, status: 1, createdAt: -1 })
notificationSchema.index({ recipient: 1, play: 1, artist: 1, role: 1 }, { unique: true })

const Notification =  mongoose.model('Notification', notificationSchema)

module.exports = Notification