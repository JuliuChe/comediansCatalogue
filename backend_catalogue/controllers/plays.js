const playsRouter = require('express').Router()
const Play = require('../models/play')
const User = require('../models/user')
const Artist = require('../models/artist')
const Theater = require('../models/theater')
const paginate = require('../utils/paginate')
const { paginationMiddleware } = require('../utils/middleware')
const notifyCastChanges = require('../services/notifications')

playsRouter.get('/', paginationMiddleware({maxLimit:100}), 
  async (request, response, next) => {
      const when = request.query.when || 'upcoming'
      if(!['upcoming', 'past'].includes(when)){
        return response.status(400).json({ error: 'invalid `when` parameter' })
      }
      const now = new Date()
      const result = await paginate(Play, 
        {
          populate:[
            {path:'createdBy', select:'username firstName lastName'},
            {path:'director', select:'firstName lastName'},
            {path:'theater', select:'name address.city'},
            {path:'artists.artist', select:'firstName lastName'}
          ],
          filter: when ==='upcoming' ?  { $or: [
            {endDate: { $gte: now}}, 
            {endDate:null, startDate : {$gte:now}}
          ]}
          : { $or:[
            {endDate: {$lt: now}}, 
            {endDate:null, startDate : {$lt:now}}
          ]},
          sort: when=='upcoming' ? {startDate: 1} : {startDate: -1},
          ...request.pagination
        })
        response.json(result)

  }
)

playsRouter.get('/:id', async (request, response) => {
  const id = request.params.id
  const plays = await Play.findById(id)
    .populate('createdBy', { username: 1, firstName: 1, lastName: 1 })
    .populate('director', { firstName: 1, lastName: 1 })
    .populate('theater', { name: 1, 'address.city':1 })
    .populate('artists.artist', { firstName: 1, lastName: 1 })
  
  if(!plays) return response.status(404).end()
  
  response.json(plays)
})



playsRouter.post('/', async (request, response) => {
  const userId= request.user
  if (!userId) return response.status(401).json({error:'token invalid'})
  
  const user = await User.findById(userId)
  if (!user) return response.status(404).json({error:'user does not exist'})

  const {
    title, 
    scriptEditor, 
    author, 
    theater, 
    director, 
    artists, 
    startDate, 
    endDate, 
    url
  }=request.body


  if(!title) return response.status(400).json({error: 'A title must be specified'})
  if(theater){
    const theaterExists = await Theater.exists({_id:theater})
    if(!theaterExists) return response.status(400).json({error: 'theater not found'})
  }
  if(director){
    const directorExists = await Artist.exists({_id:director})
    if(!directorExists) return response.status(400).json({error: 'director of the play not found'})
  }
  if(artists && artists.length>0){
    const artistsIds = artists.map(a => a.artist)
    const artistsInDb = await Artist.find({
      _id : {$in : artistsIds}
    }, '_id')
    if (artistsInDb.length !== artistsIds.length) {
      return response.status(400).json({ 
        error: 'one or more artists not found' 
      })
    }
  }

  const play = new Play ({
    title, 
    scriptEditor, 
    author, 
    theater, 
    director, 
    artists, 
    startDate, 
    endDate, 
    url,
    likes: 0,
    createdBy : userId,
  })

  const savedPlay = await play.save()
  await notifyCastChanges(null, savedPlay)  
  await savedPlay .populate('director', { firstName: 1, lastName: 1 })
  await savedPlay .populate('theater', { name: 1, 'address.city':1 })
  await savedPlay .populate('artists.artist', { firstName: 1, lastName: 1 })

  response.json(savedPlay)


})


playsRouter.delete('/:id', async (request, response) => {
  const userId= request.user
  if (!userId) return response.status(400).json({error:'token invalid'})
  
  const user = await User.findById(userId)
  if (!user) return response.status(401).json({error:'user does not exist'})

  const play = await Play.findById(request.params.id)
  if (!play) return response.status(404).end()

  if (play.createdBy.toString() !== userId) {
    return response.status(403).json({ 
      error: 'only the creator can delete this play' 
    })
  }

  await Play.findByIdAndDelete(request.params.id)
  response.status(204).end()
})




// PUT /:id : modifier une pièce (créateur uniquement)
playsRouter.put('/:id', async (request, response) => {
  const userId= request.user
  if (!userId) return response.status(400).json({error:'token invalid'})
  
  const user = await User.findById(userId)
  if (!user) return response.status(401).json({error:'user does not exist'})

  const play = await Play.findById(request.params.id)
  if (!play) return response.status(404).json({ error: 'play not found' })

  // Permission : seul le créateur peut modifier
  if (play.createdBy.toString() !== userId) {
    return response.status(403).json({
      error: 'only the creator can modify this play'
    })
  }

const oldSnapshot = {
  artists: play.artists.map(a => ({ artist: a.artist, personnage: a.personnage })),
  director: play.director
  }

  const {
    title,
    author,
    scriptEditor,
    theater,
    director,
    artists,
    startDate,
    endDate,
    url,
    likes
  } = request.body

  // Validation des références (seulement si modifiées)
  if (theater !== undefined && theater !== null) {
    const theaterExists = await Theater.exists({ _id: theater })
    if (!theaterExists) {
      return response.status(400).json({ error: 'theater not found' })
    }
  }

  if (director !== undefined && director !== null) {
    const directorExists = await Artist.exists({ _id: director })
    if (!directorExists) {
      return response.status(400).json({ error: 'director not found' })
    }
  }

  if (artists !== undefined && Array.isArray(artists) && artists.length > 0) {
    const artistIds = artists.map(a => a.artist)
    const foundArtists = await Artist.find({ _id: { $in: artistIds } }, '_id')
    if (foundArtists.length !== artistIds.length) {
      return response.status(400).json({ 
        error: 'one or more artists not found' 
      })
    }
  }

  // Mise à jour patch (uniquement les champs fournis)
  if (title !== undefined) play.title = title
  if (scriptEditor !== undefined) play.scriptEditor = scriptEditor
  if (author !== undefined) play.author = author
  if (theater !== undefined) play.theater = theater
  if (director !== undefined) play.director = director
  if (artists !== undefined) play.artists = artists
  if (startDate !== undefined) play.startDate = startDate
  if (endDate !== undefined) play.endDate = endDate
  if (url !== undefined) play.url = url
  if( likes !== undefined) play.likes = likes

  const updatedPlay = await play.save()
  await notifyCastChanges(oldSnapshot, play)  

  await updatedPlay.populate('director', { firstName: 1, lastName: 1 })
  await updatedPlay.populate('theater', { name: 1, 'address.city':1 })
  await updatedPlay.populate('artists.artist', { firstName: 1, lastName: 1 })

  response.json(updatedPlay)
})

module.exports = playsRouter