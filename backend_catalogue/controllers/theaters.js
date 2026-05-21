const theatersRouter = require('express').Router()
const Play = require('../models/play')
const User = require('../models/user')
const Artist = require('../models/artist')
const Theater = require('../models/theater')
const { escapeRegex } = require('../utils/escapeRegex')
const { normalize } = require('../utils/stringMatching')
const paginate = require('../utils/paginate')
const { paginationMiddleware } = require('../utils/middleware')

theatersRouter.get('/', paginationMiddleware({maxLimit:100}), 
  async (request, response, next) => {

    const result = await paginate(Theater, {
      populate:[
        {path:createdBy, select:'username firstName lastName'}
      ], 
      sort: {sortableName: 1},
      ...request.pagination
    })

    response.json(result)
  }
)

theatersRouter.get('/cities', async (request, response) => {
  const q = (request.query.q || '').trim()
  const filter = q 
    ? { 'address.sortableCity': new RegExp(`^${escapeRegex(normalize(q))}`) }
    : {}
  const cities = await Theater.distinct('address.city', filter)
  const seen = new Set()
  const deduped = []
  for (const city of cities.filter(Boolean)) {
    const sortable = normalize(city)
    if (!seen.has(sortable)) {
      seen.add(sortable)
      deduped.push(city)
    }
  } 
  response.json(deduped.sort())
})

theatersRouter.get('/search', async (request, response) =>{
  const name = (request.query.name || '').trim()
  const city = (request.query.city || '').trim()
  if (name.length > 2) return response.json([])
  const similar = await findSimilarTheaters(Theater, {name, city}, {threshold :0.4, limit: 10})
 
  return response.json(similar)
})

theatersRouter.get('/:id', async (request, response) => {
  const id = request.params.id
  const theater = await Theater.findById(id)
    .populate('createdBy', { username: 1, firstName: 1, lastName: 1 })

  
  if(!theater) return response.status(404).end()
  
  response.json(theater)
})

theatersRouter.delete('/:id', async (request, response) => {
  const userId= request.user
  if (!userId) return response.status(400).json({error:'token invalid'})
  
  const user = await User.findById(userId)
  if (!user) return response.status(401).json({error:'user does not exist'})

  const theater = await Theater.findById(request.params.id)
  if (!theater) return response.status(404).end()

  if (theater.createdBy.toString() !== userId) {
    return response.status(403).json({ 
      error: 'only the creator can delete this theater' 
    })
  }

  await Theater.findByIdAndDelete(request.params.id)
  response.status(204).end()
})


//TODO AT THE MOMENT THE FOLLOWING REQUESTS ARE COPIES OF PLAYS 
theatersRouter.post('/', async (request, response) => {
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

  await savedPlay .populate('director', { firstName: 1, lastName: 1 })
  await savedPlay .populate('theater', { name: 1, 'address.city':1 })
  await savedPlay .populate('artists.artist', { firstName: 1, lastName: 1 })

  response.json(savedPlay)


})







// PUT /:id : modifier une pièce (créateur uniquement)
theatersRouter.put('/:id', async (request, response) => {
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

  await updatedPlay .populate('director', { firstName: 1, lastName: 1 })
  await updatedPlay .populate('theater', { name: 1, 'address.city':1 })
  await updatedPlay .populate('artists.artist', { firstName: 1, lastName: 1 })

  response.json(updatedPlay)
})

module.exports = theatersRouter