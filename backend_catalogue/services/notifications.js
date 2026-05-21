const Notification = require('../models/notification')
const User = require('../models/user')
const findPlaysByArtistId=require('./artists') 

const computeCastDiff = (oldPlay, newPlay) => {
  const newParticipants = [
    ...newPlay.artists.map(a => ({id: a.artist.toString(), role:'cast'})),
    ...(newPlay.director ? [{id: newPlay.director.toString(), role:'director'}]:[])
  ]
  const oldParticipants = oldPlay
    ? [
        ...oldPlay.artists.map(a => ({id: a.artist.toString(), role:'cast'})),
        ...(oldPlay.director ? [{id: oldPlay.director.toString(), role:'director'}]:[])
      ]
    : []

  const added = newParticipants.filter(newMember => !oldParticipants.some( oldMember => oldMember.id === newMember.id && oldMember.role === newMember.role ))
  const removed = oldParticipants.filter(oldMember => !newParticipants.some( newMember => newMember.id === oldMember.id && newMember.role === oldMember.role ))
  return {added, removed}  
}

const createCastAddedNotifications = async (added, playId) => {
  if (added.length === 0) return
  const artistsIds = added.map(a => a.id)
  const usersToNotify = await User.find({artistProfiles:{$in:artistsIds}},'_id artistProfiles')
  const recipientByArtistId = new Map(usersToNotify.flatMap( user => {
    return user.artistProfiles
    .map( artistId => artistId.toString())
    .filter(artistId => artistsIds.includes(artistId))
    .map ( artistId => [artistId, user._id])
  }))
  for (const {id:artistId, role} of added){
    const recipient = recipientByArtistId.get(artistId)
    if(!recipient) continue
    try{
      await Notification.create({
        recipient: recipient, 
        type: 'cast_added', 
        play: playId, 
        artist: artistId, 
        role: role
      })
    } catch (err) {
       if (err.code !== 11000) throw err   // duplicate key → idempotence, on ignore
    }
  }
}

const withdrawCastRemovedNotifications= async (removed,playId) => {
  if (removed.length === 0) return

  const notifs = await Notification.updateMany( 
    {
    play:playId,
    $or : removed.map(({id, role}) => ({artist:id, role:role})),
    status: { $in : ['pending', 'accepted'] } 
    },
  {
    $set: {status:'withdrawn'}
  })
}
const notifyCastChanges = async (oldPlay, newPlay) => {
  const {added, removed} = computeCastDiff(oldPlay, newPlay)
  await createCastAddedNotifications(added, newPlay._id)
  await withdrawCastRemovedNotifications(removed, newPlay._id)



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