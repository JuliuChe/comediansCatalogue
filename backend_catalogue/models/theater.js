const { normalize } = require('../utils/stringMatching')
const mongoose = require('mongoose')

mongoose.set('strictQuery',false)

const theaterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sortableName:{
    type:String,
    lowercase:true
  },
  address: {
    street: String,
    city: {
      type:String,
      required:true
    },
    sortableCity:{
      type:String,
      lowercase:true
    },
    postalCode: Number,
    country: String
  },
  capacity: Number,
  createdBy:{
      type: mongoose.Schema.Types.ObjectId,
      ref:'User',
      required:true
    }
},
{timestamps: true})

// 2. hook validate
theaterSchema.pre('validate', function() { 
  //this is the document about to be saved
  this.sortableName=normalize(this.name)
  if(this.address?.city){
    this.address.sortableCity=normalize(this.address.city)
  }
  
})   

// 3. hook anti-update
theaterSchema.pre(/^findOneAnd|^update|^replace/, function() {
    throw new Error('Theater updates must go through findById + .save() to enforce validation')
})  

theaterSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

theaterSchema.index({ sortableName: 1, _id: 1 })

const Theater =  mongoose.model('Theater', theaterSchema)

module.exports = Theater