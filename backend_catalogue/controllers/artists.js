const artistsRouter = require('express').Router()
const Play = require('../models/play')
const User = require('../models/user')
const Artist = require('../models/artist')



artistsRouter.get('/', async (request, response) => {
  const artists = await Artist.find({})
    .populate('user', { username: 1, name: 1 })
    
  response.json(artists)
})

artistsRouter.get('/search', async (request, response) => {
  // ../api/search?q=${query}
  const query = request.query.q || ''
  if (query.length<2) {
    return response.json([])
  }

  const safeQuery = escapeRegex(query)
  const regex = new RegExp(`^${safeQuery}`, 'i') // 'i' = insensible à la casse

  const artists = await Artist
    .find({
      $or: [{firstName:regex},{lastName:regex}]
    })
    .limit(10)
    .select('firstName lastName')

    return response.json(artists)
})

artistsRouter.get('/:id/plays', async (request, response) =>{
  const plays = await Play.find({
    $or:[      
      {director:request.params.id},
      {'artists.artist':request.params.id}
    ]
  })
    .populate('theater', 'name city')
    .sort({startDate:-1})

    response.json(plays)
})

artistsRouter.post('/', async (request, response) =>{
  const user = request.user
  if(!user){
    return response.status(401).json({error: 'token invalid'})

      const { firstName, lastName, dateOfBirth } = request.body

  if (!firstName || !lastName) {
    return response.status(400).json({ 
      error: 'firstName and lastName are required' 
    })
  }

  const artist = new Artist({
    firstName,
    lastName,
    biography,
    dateOfBirth
  })

  const savedArtist = await artist.save()
  response.status(201).json(savedArtist)
  }
})

// blogsRouter.post('/', async (request, response) => {
//   const body = request.body
//   if (body.likes === undefined) {
//     body.likes = 0
//   }

//   if (!body.title || !body.url) {
//     return response.status(400).end()
//   }

//   if (!request.token) {
//     return response.status(401).json({ error: 'token missing' })
//   }

//   const user = await User.findById(request.user)

//   if(!user){
//     return response.status(400).json({ error: 'user id is not in the DB' })
//   }
//   const blog = new Blog({
//     title:body.title,
//     author:body.author,
//     url:body.url,
//     likes:body.likes,
//     user:user.id
//   })


//   user.blogs = user.blogs.concat(blog.id)
//   await user.save()

//   const savedBlog = await blog.save()
//   const populatedBlog = await savedBlog.populate('user',{ username :1, name:1 })
//   console.log(populatedBlog)
//   response.status(201).json(populatedBlog)

// })

// blogsRouter.delete('/:id', async (request, response) => {
//   if (!request.token) {
//     return response.status(401).json({ error: 'token missing' })
//   }

//   const blog = await Blog.findById(request.params.id)
//   if (!blog) {
//     return response.status(404).json({ error: 'blog not found' })
//   }

//   if (!blog.user || blog.user.toString() !== request.user) {
//     console.log(blog.user, blog.user.toString(), request.user)
//     return response.status(403).json({ error: 'forbidden' })
//   }

//   await Blog.findByIdAndDelete(request.params.id)
//   response.status(204).end()
// })

// blogsRouter.put('/:id', async (request, response) => {
//   const blogToUpdate = await Blog.findById(request.params.id)
//   if (!blogToUpdate) {
//     response.status(404).end()
//   }

//   const { title, author, url, likes, user } = request.body

//   if (title) { blogToUpdate.title = title }
//   if (author) { blogToUpdate.author = author }
//   if (url) { blogToUpdate.url = url }
//   if (likes) { blogToUpdate.likes = likes }
//   if (user) {  blogToUpdate.user = user }
//   const updatedBlog = await blogToUpdate.save()
//   const blog = await Blog.findById(updatedBlog.id).populate('user',{ username :1, name:1 })
//   response.status(200).json(blog)
// })

module.exports = artistsRouter