import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TextField, Button } from '@mui/material'

const SubscribeForm = ({ handler }) => {
  const [username, setUsername] = useState([])
  const [name, setName] = useState([])
  const [password, setPassword] = useState([])
  const [email, setEmail]=useState([])
  const navigate=useNavigate()

  const submitForm = async (event) => {
    event.preventDefault()
    await handler({name, email, username, password})
    setName('')
    setEmail('')
    setUsername('')
    setPassword('')
    navigate('/')
  }
  return (
    <form onSubmit={submitForm} aria-label="login form">
      <div>
        <h2>Créer un nouvel utilisateur</h2>
        <div>
          <TextField label="nom" value={name} onChange={({ target }) => setName(target.value)} variant="standard" />
        </div>
        <div>
          <TextField label="e-mail" type="email" value={email} onChange={({ target }) => setEmail(target.value)} variant="standard" />
        </div>
        <div>
          <TextField label="nom d'utilisateur" value={username} onChange={({ target }) => setUsername(target.value)} variant="standard"/>
        </div>
        <div>
          <TextField label="mot de passe" value={password} type="password" onChange={({ target }) => setPassword(target.value)} variant="standard" />
        </div>
        <div>
          <Button type="submit" variant="contained" style={{ marginTop: 10 }}>connexion</Button>
        </div>
      </div>
    </form>)
}

export default SubscribeForm