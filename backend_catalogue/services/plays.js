
const Play = require('../models/play')

const findPlaysByArtistId = async (artistId) => {
    return await Play.find({
    $or:[      
      {director:artistId},
      {'artists.artist':artistId}
    ]
  })
    .populate('theater', 'name city')
    .sort({startDate:-1})
}

module.exports = findPlaysByArtistId