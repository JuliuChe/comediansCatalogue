import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TextField, Button } from '@mui/material'

const LoginForm = ({ handler }) => {
  const [username, setUsername] = useState([])
  const [password, setPassword] = useState([])
  const navigate=useNavigate()

  const submitForm = async (event) => {
    event.preventDefault()
    await handler(username, password)
    setUsername('')
    setPassword('')
    navigate('/')
  }

  const newUser = (event) => {
    event.preventDefault()
    navigate('/newUser')
  }
  return (
    <form onSubmit={submitForm} aria-label="login form">
      <div>
        <h2>Se connecter à l'application</h2>
        <div>
          <TextField label="nom d'utilisateur" value={username} onChange={({ target }) => setUsername(target.value)} variant="standard"/>
        </div>
        <div>
          <TextField label="mot de passe" value={password} type="password" onChange={({ target }) => setPassword(target.value)} variant="standard" />
        </div>
        <div>
          <Button type="submit" variant="contained" style={{ marginTop: 10 }}>connexion</Button>
        </div>
        <div>
          <Button variant="contained" onClick = {newUser} style={{ marginTop: 10 }}>Créer un compte</Button>
        </div>
      </div>
    </form>)
}

export default LoginForm