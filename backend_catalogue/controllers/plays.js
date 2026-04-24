const playsRouter = require('express').Router()
const Play = require('../models/play')
const User = require('../models/user')
const Artist = require('../models/artist')



playsRouter.get('/', async (request, response) => {
  const plays = await Play.find({})
    .populate('user', { username: 1, name: 1 })
    .populate('director', { firstName: 1, lastName: 1 })
    .populate('theater', { name: 1 })
    .populate('artists.artist', { firstName: 1, lastName: 1 })
      .populate(
      {path:'artist',
      select:'firstName lastName plays',
      populate: {
        path:'plays',
        select:'title author startDate endDate theater',
        populate: {
          path:'theater',
          select:'name'
        }
      }
    })
  response.json(plays)
  // Blog.find({}).then((blogs) => {
  //   response.json(blogs)
  // })
})

// playsRouter.post('/', async (request, response) => {
//   const body = request.body
//   if (body.likes === undefined) {
//     body.likes = 0
//   }

//   if (!body.title ) {
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

module.exports = playsRouter