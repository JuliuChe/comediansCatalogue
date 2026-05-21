const { findSimilarArtists, normalizeFields, normalize } = require('../utils/stringMatching')
const { escapeRegex } = require('../utils/escapeRegex')
const  paginate = require('../utils/paginate')
const { paginationMiddleware } = require('../utils/middleware')

const artistsRouter = require('express').Router()
const Play = require('../models/play')
const Artist = require('../models/artist')
const User = require('../models/user')
const Notification = require('../models/notification')
const findPlaysByArtistId = require('../services/artists')


artistsRouter.get('/', paginationMiddleware({maxLimit:100}), 
  async (request, response, next) => {

    const result = await paginate(Artist, 
      {
        populate:{path:'createdBy', select:'username'},
        sort: {sortableName:1},
        ...request.pagination})
    response.json(result)

  })

artistsRouter.get('/search', async (request, response) => {
  // ../api/search?q=${query}
  const query = (request.query.q || '').trim()
  if (query.length<2) {
    return response.json([])
  }
  const maxResults = 10
  const similar = await findSimilarArtists(Artist, query, {threshold : 0.3, limit:maxResults})
 
  return response.json(similar)
})

artistsRouter.get('/check-duplicates', async (request, response) => {
  // .../api/check-duplicates?name=${name}
  const typedName = (request.query.name || '').trim()
  if(!typedName) return response.status(400).json({error:'name_required', message:'The name parameter is missing from the request and cannot be empty' })

  const similar = await findSimilarArtists(Artist, typedName, {threshold : 0.6})
  
  return response.json(similar)
})

artistsRouter.get('/me', async (request, response) => {
  const userId= request.user
  if (!userId) return response.status(401).json({error:'token invalid'})
  
  const user = await User.findById(userId)
  if (!user) return response.status(404).json({error:'user does not exist'})
  
  if(user.artistProfiles.length === 0) return response.status(204).end()
  const profiles = await Promise.all(user.artistProfiles.map(async (artistId)=> {
    const artist = await Artist.findById(artistId)
    const artistPlays = await findPlaysByArtistId(artistId)
    return {artist, artistPlays} 
  }))

  response.json(profiles)

})

artistsRouter.get('/:id/plays', async (request, response) =>{
  const plays = await findPlaysByArtistId(request.params.id)
  const userOfArtist = await User.findOne({artistProfiles:request.params.id})
  if (!userOfArtist){
    return response.json(plays)  
  }

  const acceptedPlayIds = await Notification.distinct('play', {
    recipient: userOfArtist._id,
    status: 'accepted'
  })
  // → [ObjectId('aaa'), ObjectId('bbb')]  — tableau d'ObjectIds, pas de docs

  const acceptedSet = new Set(acceptedPlayIds.map(String))
  const publicPlays = plays.filter((play) => acceptedSet.has(play._id.toString()) )
  
  response.json(publicPlays)
})

artistsRouter.get('/:id', async (request, response) =>{
  const artist = await Artist.findById(request.params.id)
  
  response.json(artist)
})

artistsRouter.post('/', async (request, response) =>{
  const userId = request.user
  if(!userId) return response.status(401).json({error: 'token invalid'})
  
  const user = await User.findById(userId)
  if (!user) return response.status(404).json({error:'user does not exist'})
  
  const { name } = request.body

  if (!name) {
    return response.status(400).json({ 
      error: 'Name for the artist is required' 
    })
  }

  const exactExisting = await Artist.findOne({ sortableName: normalize(name) })
  if (exactExisting ) {
    return response.status(409).json({
      error: 'artist_already_exists',
      existing: { id: exactExisting._id, name: exactExisting.name }
    })
  }

 
  const artist = new Artist({
    name,
    createdBy:userId
  })

  const savedArtist = await artist.save()
  response.status(201).json(savedArtist)
})


module.exports = artistsRouter