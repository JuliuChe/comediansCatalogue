const { findSimilarArtists, similarity, normalizeFields, normalize } = require('../utils/stringMatching')
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
        sort: {firstName:1, lastName:1},
        ...request.pagination})
    response.json(result)

  })

artistsRouter.get('/search', async (request, response) => {
  // ../api/search?q=${query}
  const query = request.query.q || ''
  if (query.length<2) {
    return response.json([])
  }

  console.log(query)

  const safeQuery = await escapeRegex(query)
  const regex = new RegExp(`^${safeQuery}`, 'i') // 'i' = insensible à la casse

  const artists = await Artist
    .find({
      $or: [{firstName:regex},{lastName:regex}]
    })
    .limit(10)
    .select('firstName lastName')

  const sorted = artists
    .map(a => ({
      artist: a,
      score: Math.max(
        similarity(a.firstName, query),
        similarity(a.lastName, query),
        similarity(`${a.firstName} ${a.lastName}`, query)
      )
    }))
    .sort((a, b) => b.score - a.score)
    .map(item => item.artist)


    return response.json(sorted)
})

artistsRouter.get('/me', async (request, response) => {
  const userId= request.user
  if (!userId) return response.status(401).json({error:'token invalid'})
  
  const user = await User.findById(userId)
  if (!user) return response.status(404).json({error:'user does not exist'})
  
  if(!user.artistProfile) return response.status(204).end()

  const userPlays = await findPlaysByArtistId(user.artistProfile)

  const artist = await Artist.findById(user.artistProfile)

  response.json({artist, userPlays})

})

artistsRouter.get('/:id/plays', async (request, response) =>{
  const plays = await findPlaysByArtistId(request.params.id)
  const userOfArtist = await User.findOne({artistProfile:request.params.id})
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
  
  const user = User.findById(userId)
  if (!user) return response.status(404).json({error:'user does not exist'})
  
  // const { firstName, lastName, dateOfBirth, forceCreate } = normalizeFields(request.body, ['firstName', 'lastName'])
  const { firstName, lastName, dateOfBirth, forceCreate } = request.body

  if (!firstName || !lastName) {
    return response.status(400).json({ 
      error: 'firstName and lastName are required' 
    })
  }

  if (!forceCreate) {
    const similar = await findSimilarArtists(Artist, normalize(firstName), normalize(lastName))
    //TODO do not check for doublons here. 
    // If a post request is issued, there should not be a doublons (pre-check)
    if (similar.length > 0) {
      return response.status(409).json({
        error: 'similar_artists_found',
        message: 'Des artists au nom similaire existent déjà. Est-ce un doublon ?',
        similar
      })
    }
  }
 
  const artist = new Artist({
    firstName,
    lastName,
    dateOfBirth,
    createdBy:userId
  })

  const savedArtist = await artist.save()
  response.status(201).json(savedArtist)
})


module.exports = artistsRouter