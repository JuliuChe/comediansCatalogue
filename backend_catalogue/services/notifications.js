const Notification = require('../models/notification')
const User = require('../models/user')
const findPlaysByArtistId=require('./artists') 


const notifyCastChanges = async (oldPlay, newPlay) => {

  const newArtistsIds = newPlay.artists.map( a => a.artist.toString())
  const oldArtistsIds=oldPlay ? oldPlay.artists.map( a => a.artist.toString()):[]
  const addedCastsIds = newArtistsIds.filter( (artist) => !oldArtistsIds.includes(artist))

  const newDirectorId = newPlay.director?.toString() ?? null
  const oldDirectorId = oldPlay?.director?.toString() ?? null
  const addedDirectorId = (newDirectorId && newDirectorId !== oldDirectorId) 
    ? newDirectorId 
    : null
  
  const artistsToAdd = [...addedCastsIds.map(id => ({artistId:id, role:'cast'})),
     ...(addedDirectorId ? [{artistId:addedDirectorId, role:'director'}] : []) ]
  if (artistsToAdd.length === 0) return

  const artistsIds = artistsToAdd.map(a => a.artistId)
  const usersToNotify = await User.find({artistProfile:{$in:artistsIds}},'_id artistProfile')
  const recipientByArtistId = new Map(usersToNotify.map( u => [u.artistProfile.toString(), u._id]))
  for (const {artistId, role} of artistsToAdd){
    const recipient = recipientByArtistId.get(artistId)
    if(!recipient) continue
    try{
      await Notification.create ({
        recipient: recipient, 
        type: 'cast_added', 
        play: newPlay._id, 
        artist: artistId, 
        role: role
      })
    } catch (err) {
       if (err.code !== 11000) throw err   // duplicate key → idempotence, on ignore
    }
  }

}

const notifyExistingPlaysForArtist = async (recipientId, artistId) => {
  // 1. Trouver toutes les pièces concernées
  //    → réutilise findPlaysByArtistId depuis ./artists
  
  const userPlays = await findPlaysByArtistId(artistId)
  // 2. Pour chaque pièce, déterminer les rôles (cast et/ou director)
  //    Un même artiste peut être les DEUX dans la même pièce → 2 notifs
  const artistIdStr = artistId.toString()
  const playsRoles = userPlays.flatMap(play => {
    const artistsIds=play.artists.map( a => a.artist.id)
    const directorId = play.director?.id ?? null
    const targets = []
    if (artistsIds.includes(artistIdStr)){
      targets.push({play:play._id, role:'cast'})
    }
    if(artistIdStr === directorId){
      targets.push({play:play._id, role:'director'})
    }
    return targets
  })
  // 3. Pour chaque (play, role), créer la notif avec try/catch idempotence
  for (const {play, role} of playsRoles){
    try{
      await Notification.create ({
        recipient: recipientId, 
        type: 'cast_added', 
        play: play, 
        artist: artistId, 
        role: role
      })
    } catch (err) {
      if (err.code !== 11000) throw err   // duplicate key → idempotence, on ignore
    }
  }
}

module.exports = {notifyCastChanges, notifyExistingPlaysForArtist}