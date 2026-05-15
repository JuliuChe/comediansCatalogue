const mongoose = require('mongoose')

mongoose.set('strictQuery', false)

const suggestedEditSchema = mongoose.Schema({
  play: {
      type: mongoose.Schema.Types.ObjectId,
      ref:'Play', //The ref field specifies the name of the model being referenced
      required:true
    },
  proposedBy:{
      type: mongoose.Schema.Types.ObjectId,
      ref:'User',
      required:true
    },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    required:true
  },
  reason:String,
  status: {
    type : String,
    enum:['pending', 'accepted', 'rejected', 'withdrawn'],
    default:'pending'
  },
  reviewedBy:{
      type: mongoose.Schema.Types.ObjectId,
      ref:'User'
    },
  reviewedAt:Date},
  {timestamps: true}  // ajoute createdAt et updatedAt automatiquement
)


suggestedEditSchema.index({ play: 1, status: 1 })
suggestedEditSchema.index({ proposedBy: 1, status: 1 })

suggestedEditSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const Suggestions =  mongoose.model('Suggestion', suggestedEditSchema)

module.exports = Suggestions