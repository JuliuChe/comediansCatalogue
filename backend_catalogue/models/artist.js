const { normalize } = require('../utils/stringMatching')
const mongoose = require('mongoose')

mongoose.set('strictQuery', false)
// 1. Schema of artist
const artistSchema = mongoose.Schema({
  firstName: {
    type:String,
    trim: true
  },
  lastName: {
    type:String,
    trim: true
  },
  name:{
    type:String,
    trim: true,
    required:true
  },
  sortableName:{
    type:String,
    lowercase:true
  },
  nameTokens:{
    type:[String],
    index:true
  },
  nameTrigrams:{
        type:[String],
    index:true
  },
  published:{
    type:Boolean,
    default:true
  },
  alsoKnownAs:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Artist'
  }],
  dateOfBirth: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref:'User'
  }
})

// 2. hook validate
artistSchema.pre('validate', async function() { 
  //this is the document about to be saved
  this.sortableName=normalize(this.name)
  this.nameTokens = this.sortableName.split(' ').filter(Boolean)
  this.nameTrigrams = this.nameTokens.flatMap( tok => {
    let trigrams = []
    for (let i = 0; i+3<=tok.length;i++){
      trigrams.push(tok.slice(i,i+3))
    }
    return trigrams
  })
 })   

// 3. hook anti-update
artistSchema.pre(/^findOneAnd|^update|^replace/, function() {
    throw new Error('Artist updates must go through findById + .save() to enforce validation')
  })  

artistSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

artistSchema.index({ sortableName: 1, _id: 1 })

const Artist =  mongoose.model('Artist', artistSchema)

module.exports = Artist