const Play = require('../models/play')

const notificationCastChanges = async (oldPlay, newPlay) => {
  const oldArtistsList = oldPlay.artists
  const newArtistsList = newPlay.artists
  const artistsToAdd = newArtistsList.filter( (artist) => { if(!oldArtistsList.includes(artist)) return artist })
  const artistsToRemove = oldArtistsList.filter( (artist) => { if(!newArtistsList.includes(artist)) return artist })
  if (oldPlay.director !== newPlay.director){
    //Notify new director has been added
  }    
}

module.exports = notificationCastChanges