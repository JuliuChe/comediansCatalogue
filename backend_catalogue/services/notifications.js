const Notification = require('../models/notification')
const User = require('../models/user')

const notifyCastChanges = async (oldPlay, newPlay) => {
  const newArtistsIds = newPlay.artists.map( a => a.artist.toString())
  const oldArtistsIds=oldPlay ? oldPlay.artists.map( a => a.artist.toString()):[]
  const addedCastsIds = newArtistsIds.filter( (artist) => !oldArtistsIds.includes(artist))

  const newDirectorId = newPlay.director?.toString() ?? null
  const oldDirectorId = oldPlay?.director?.toString() ?? null
  const addedDirectorId = (newDirectorId && newDirectorId !== oldDirectorId) 
    ? newDirectorId 
    : null
  
  const artistsToAdd = [...addedCastsIds, ...(addedDirectorId ? [addedDirectorId] : []) ]
  if (artistsToAdd.length === 0) return

  const usersToNotify = await User.find({artistProfile:{$in:artistsToAdd}},'_id artistProfile')
  for (const user of usersToNotify){
    try{
      const role = user.artistProfile.toString() === addedDirectorId ? 'director' : 'cast'
      await Notification.create ({
        recipient: user._id, 
        type: 'cast_added', 
        play: newPlay._id, 
        artist: user.artistProfile, 
        role: role
      })
    } catch (err) {
       if (err.code !== 11000) throw err   // duplicate key → idempotence, on ignore
    }
  }

}

module.exports = notifyCastChanges