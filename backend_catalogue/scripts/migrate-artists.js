

const Artist = require('../models/artist')
const mongoose = require('mongoose')
const config = require('../utils/config')
const logger = require('../utils/logger')


const main = async () =>{
  const mongoUrl = config.MONGODB_URI
  try {
    await mongoose
      .connect(mongoUrl, { family: 4 })
      .then(() => {
        logger.info('connected to MongoDB')
      })
      .catch((error) => {
        logger.error('error connection to MongoDB:', error.message)
      })


      const artistToMigrate = await Artist.find({name:{$exists:false}})
      logger.info(`${artistToMigrate.length} artistes à migrer`)
      let count = 0
      for (const artist of artistToMigrate){
        artist.name = `${artist.firstName || ''} ${artist.lastName || ''}`.trim()
        await artist.save()
        count +=1
      }
      logger.info(`Migration terminée : ${count} artistes`)

  } catch (err) {
    logger.error(`Error during migration : ${err}`)
  } finally {
      mongoose.disconnect()
  }
}

main()