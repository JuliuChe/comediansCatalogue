const mongoose = require('mongoose')

mongoose.set('strictQuery',false)

const theaterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: {
    street: String,
    city: String,
    postalCode: String,
    country: String
  },
  capacity: Number,
  createdBy:{
      type: mongoose.Schema.Types.ObjectId,
      ref:'User',
      required:true
    }
})

theaterSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

const Theater =  mongoose.model('Theater', theaterSchema)

module.exports = Theater