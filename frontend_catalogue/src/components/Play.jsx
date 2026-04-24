import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardActions, Typography, Button, Link } from '@mui/material'

const Play = ({ play, handleLike, handleRemove }) => {

  const navigate = useNavigate()

  const onRemove = (id) => {
    handleRemove(id)
    navigate('/')
  }

  if (!play) {
    return <div>Loading...</div>
  }

  const currentUser = () => {
    const loggedUsrJson = window.localStorage.getItem('loggedCatalogappUser')
    return loggedUsrJson?JSON.parse(loggedUsrJson).username:null
  }

  const addRemoveBtn = (play, currentUser) => {
    return currentUser === play.user.username ? <Button color="error" variant="outlined"
      sx={{
        borderWidth: 2,
        '&:hover': { borderWidth: 2,  bgcolor: 'rgba(170, 104, 88, 0.3)' }  // garde 2px au survol
      }}
      onClick={() => onRemove(play.id)}>remove</Button> : null
  }
  console.log(play)
  return (
    <Card sx={{ width:'90%', marginTop:'25px', pb:2 }}>
      <CardContent sx={{ marginTop:'20px', '&:last-child': { pb: 1 } }} className='details'>
        <Typography variant="h5" component="div" data-testid="title_det" sx={{ marginBottom:'15px' }}>{play.title}</Typography>
        <Typography variant="body2" component="div" data-testid="author_det" sx={{ marginBottom:'12px', fontSize: '1.1rem', color: 'grey.700' }}>de {play.author}</Typography>
        <Typography variant="body2" component="div" data-testid="director_det" sx={{ marginBottom:'12px', fontSize: '1.1rem', color: 'grey.700' }}>mis en scène par {play.director.firstName} {play.director.lastName} </Typography>
        <Typography variant="body2" component="div" data-testid="director_det" sx={{ marginBottom:'12px', fontSize: '1.1rem', color: 'grey.700' }}>Au théatre {play.theater.name} </Typography>
        <Link href={play.url} data-testid="url" sx={{ fontSize: '1.1rem' }}>{play.url}</Link>
        <Typography 
          variant="body2" 
          component="div" 
          data-testid="artists_det" 
          sx={{ marginBottom: '12px', fontSize: '1.1rem', color: 'grey.700' }}
        >
          avec {play.artists.filter(a => a.role==='comedien').map(a => `${a.firstName} ${a.lastName} dans le rôle de ${a.personnage}`).join(', ')}
        </Typography>

      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-start',px:2 }}>
        <Typography variant="body2" data-testid="likes" sx={{ fontSize: '1rem' }}>{play.likes} likes</Typography>
        {currentUser() ? <Button color="primary" variant="outlined"
          sx={{
            borderWidth: 2,
            '&:hover': { borderWidth: 2,  bgcolor: 'rgba(49, 70, 148, 0.2)' }  // garde 2px au survol
          }} onClick={() => handleLike(play)}>like</Button> : <>likes</>}
        {addRemoveBtn(play, currentUser())}
      </CardActions>
    </Card>

  )
}

export default Play