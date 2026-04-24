import { useState, useEffect } from 'react'
import Play from './components/Play'
import Notification from './components/Notification'

import LoginForm from './components/LoginForm'
import SubscribeForm from './components/SubscribeForm'
import PlayForm from './components/PlayForm'

import playService from './services/plays'
import loginService from './services/login'
import userService from './services/user'

import { Routes, Route, Link, useMatch } from 'react-router-dom'
import { Container, Toolbar, AppBar, Button, Box } from '@mui/material'

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { fr } from 'date-fns/locale'


import PlayList from './components/PlayList'

const App = () => {
  const [plays, setPlays] = useState([])
  const [notification, setNotification] = useState({ message: null, type: 'info' })
  const [user, setUser] = useState(() => {
    const loggedUserJSON = window.localStorage.getItem('loggedCatalogappUser')
    return loggedUserJSON ? JSON.parse(loggedUserJSON) : null
  })
  const match = useMatch('/blogs/:id')
  const play = match
    ? plays.find(play => play.id === match.params.id)
    : null

  useEffect(() => {
    playService.getAll().then(plays =>
      setPlays(plays)
    )
  }, [])

  useEffect(() => {
    if (user?.token) {
      console.log('Adding token for ' + user.name)
      playService.setToken(user.token)
    }
  }, [user])

  const handleLogin = async (username, password) => {
    try {
      console.log(username, password)
      const user = await loginService.login({ username, password })
      setUser(user)
      window.localStorage.setItem('loggedCatalogappUser', JSON.stringify(user))
      console.log(user)

    } catch {
      setNotification({ message: 'Wrong login credentials', type: 'error' })
      setTimeout(() => { setNotification({ ...notification, message: null }) }, 5000)
    }
  }

  const handleNewPlay = async (newPlay) => {
    try {
      // blogFormRef.current.toggleVisibility()
      console.log(newPlay)
      const play = await playService.create(newPlay)
      setPlays(plays.concat(play))
      setNotification({ message: `a new play ${play.title} by ${play.author} added`, type: 'success' })
      setTimeout(() => { setNotification(prev => ({ ...prev, message: null })) }, 5000)
    } catch {
      setNotification({ message: 'Could not add new play', type: 'error' })
      setTimeout(() => { setNotification(prev => ({ ...prev, message: null })) }, 5000)
    }
  }

    const handleNewUser = async (newUser) => {
    try {
      // blogFormRef.current.toggleVisibility()
      console.log(newUser)
      const userCreated = await userService.createUser(newUser)
      setNotification({ message: `a new user ${userCreated.username} added`, type: 'success' })
      setTimeout(() => { setNotification(prev => ({ ...prev, message: null })) }, 5000)
    } catch {
      setNotification({ message: 'Could not add new user', type: 'error' })
      setTimeout(() => { setNotification(prev => ({ ...prev, message: null })) }, 5000)
    }
  }



  const handleLike = async (playToUpdate) => {
    const { id, ...updatedBlog } = { ...playToUpdate, likes: playToUpdate.likes + 1, user: playToUpdate.user.id }
    const response = await playService.updatePlay(id, updatedBlog)
    setPlays(plays.map(play => play.id === id ? response : play))
  }

  const handleRemove = async (playId) => {
    const play = plays.filter(p => p.id === playId)[0]
    console.log(play)
    const deleteBlog = window.confirm(`Remove blog ${play.title} ${play.author}`)
    if (deleteBlog) {
      try {
        const response = await playService.deleteBlog(playId)
        console.log(response)
        setPlays(plays.filter(b => b.id !== playId))
        setNotification({ message: `Blog ${play.title} ${play.author} successfully deleted from DB`, type: 'success' })
        setTimeout(() => { setNotification({ ...notification, message: null }) }, 5000)
      } catch {
        setNotification({ message: `Could not delete blog with id : ${playId}`, type: 'error' })
        setTimeout(() => { setNotification({ ...notification, message: null }) }, 5000)
      }
    }
  }


  // const blogFormRef = useRef()

  const style = { fontWeight: 'medium', fontSize:'0.95rem' }
  const toolbar = {
    display: 'flex',
    flexDirection: 'row-reverse'
  }

  return (
    
    <Container>
      <AppBar position="static" sx={style}>
        <Toolbar sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between'
        }}>
          <Button color="inherit" component={Link} size="large" sx={{ fontSize: '1.5rem', fontWeight: 'medium', textTransform: 'none' }} to="/">Catalogue Application</Button>
          <Box color="inherit" sx={toolbar}>
            {user ? <Button
              color="inherit"
              sx={style}
              onClick={() => { setUser(null); window.localStorage.removeItem('loggedCatalogappUser') }}>
              logout</Button> : <Button color="inherit" component={Link} sx={style} to="/login">login</Button>}
            {user ? <Button color="inherit" component={Link} sx={style} to="/create">Nouvelle Pièce</Button> : <></>}
            <Button color="inherit" component={Link}  sx={style} to="/">Pièces</Button>
          </Box>
        </Toolbar>
      </AppBar>
      <div>
        <Notification message={notification.message} type={notification.type} />
      </div>
      <Routes>
        <Route path="/plays/:id" element={
          <Play play={play} handleLike={handleLike} handleRemove={handleRemove} />
        } />
        <Route path="/login" element={
          <LoginForm handler={handleLogin} />
        } />
        <Route path="/create" element={<PlayForm createPlay={ handleNewPlay } /> }/>
        <Route path="/newUser" element={<SubscribeForm handler={ handleNewUser } /> }/>
        <Route path="/" element={<PlayList blogs={ plays } user = {user} />} />
      </Routes>
    </Container>
  )
}

export default App