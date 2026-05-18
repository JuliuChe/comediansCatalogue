const notificationsRouter = require('express').Router()
const User = require('../models/user')
const Notification = require('../models/notification')
const Play = require('../models/play')


notificationsRouter.get('/', async (request, response) => {
 // ../api/notification?status=${query}
  

  const userId= request.user
  if (!userId) return response.status(401).json({error:'token invalid'})
  
  const user = await User.findById(userId)
  if (!user) return response.status(404).json({error:'user does not exist'})
  
  const validStatuses = ['pending', 'accepted', 'rejected', 'withdrawn']
  const status = request.query.status || 'pending'
  if(!validStatuses.includes(status)){
    return response.status(400).json({ error: 'invalid status' })
  }

  const notifsOfUser = await Notification.find({ recipient:userId,status:status })
    .populate({path:'play', select: {title: 1, director:1, startDate: 1}, 
      populate : {path:'director', select: {firstName:1, lastName:1}}
    })
    .populate('artist', {firstName:1, lastName:1})
    .sort({ createdAt: -1 })
  
  

  response.status(200).json(notifsOfUser)
})

notificationsRouter.patch('/:id', async (request, response) => {
  const userId= request.user
  if (!userId) return response.status(401).json({error:'token invalid'})
  
  const user = await User.findById(userId)
  if (!user) return response.status(404).json({error:'user does not exist'})
  
  const validStatuses = ['accepted', 'rejected']
  const {status} = request.body
  if(!validStatuses.includes(status)){
    return response.status(400).json({ error: 'invalid status change' })
  }
  const notificationId = request.params.id
  const notification = await Notification.findById(notificationId)
  if (!notification) return response.status(404).json({ error: 'notification not found' })

  if(notification.recipient.toString() !== userId){
    return response.status(403).json({ error: 'Invalid user, notification status cannot be changed' })
  }

  if (notification.status === 'withdrawn') {
  return response.status(409).json({ error: 'cannot accept/reject a withdrawn notification' })
}

  notification.status = status
  await notification.save()
  await notification  
    .populate([{
      path:'play', select: {title: 1, director:1, startDate: 1}, 
        populate : {path:'director', select: {firstName:1, lastName:1}}
      },
    { path:'artist', select:{firstName:1, lastName:1}}])
  
  response.json(notification)
  
})

module.exports = notificationsRouter