
import { TextField, Button, Stack, Box, Typography, IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const emptyComedian = () => ({ firstName: '', lastName: '', role: '' })


const PlayForm = ({ createPlay}) => {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [scriptEditor, setScriptEditor]=useState('')
  const [director, setDirector]=useState('')
  const [comedians, setComedians]=useState([emptyComedian()])

  const [url, setUrl] = useState('')
  const navigate = useNavigate()
  const handleSubmit = async (event) => {
    event.preventDefault()
    const validComediens = comedians.filter(
      c => c.firstName.trim() && c.lastName.trim()
    )
    await createPlay({
      title,
      author,
      scriptEditor,
      director,
      url,
      comediens: validComediens,
    })
    setTitle('')
    setAuthor('')
    setScriptEditor('')
    setDirector('')
    setUrl('')
    setComedians([emptyComedian()])
    navigate('/')
  }

  const handleComedienChange = (index, field, value) => {
    setComedians(comedians.map((c, i) =>
      i === index ? { ...c, [field]: value } : c
    ))
  }

  const handleAddComedian = () => {
    setComedians([...comedians, emptyComedian()])
  }

  const handleRemoveComedian = (index) => {
    setComedians(comedians.filter((_, i) => i !== index))
  }

  const textFieldStyle= {
    '& .MuiInputBase-input':
      { padding: '4px 10px', margin: 'auto' },
    '& .MuiInputLabel-root':
      { top: '-5px', },
    '& .MuiInputLabel-shrink':
      { top: '-3px', }
  }
  return (
    <div>
      <h2>Nouvelle pièce</h2>
      <form onSubmit={handleSubmit}>
        <Stack spacing={2} sx={{ marginTop: 2, width:300 }}>
          <TextField label="Titre" value={title} onChange={({ target }) => setTitle(target.value)} variant="outlined" size="small"
            sx={textFieldStyle} />
          <TextField label="Auteur" value={author} onChange={({ target }) => setAuthor(target.value)} variant="outlined" size="small" sx={textFieldStyle} />
          <TextField label="Adaptateur" value={scriptEditor} onChange={({ target }) => setScriptEditor(target.value)} variant="outlined" size="small" sx={textFieldStyle} />
          <TextField label="Metteur en scène" value={director} onChange={({ target }) => setDirector(target.value)} variant="outlined" size="small" sx={textFieldStyle} />  
          <TextField label="url" value={url} onChange={({ target }) => setUrl(target.value)} variant="outlined" size="small" sx={textFieldStyle}/>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Comédiens
            </Typography>
            <Stack spacing={1}>
              {comedians.map((comedien, index) => (
                <Stack key={index} direction="row" spacing={1} alignItems="center">
                  <TextField
                    label="Prénom"
                    value={comedien.firstName}
                    onChange={({ target }) => handleComedienChange(index, 'firstName', target.value)}
                    variant="outlined" size="small" sx={textFieldStyle}
                  />
                  <TextField
                    label="Nom"
                    value={comedien.lastName}
                    onChange={({ target }) => handleComedienChange(index, 'lastName', target.value)}
                    variant="outlined" size="small" sx={textFieldStyle}
                  />
                  <TextField
                    label="Rôle"
                    value={comedien.role}
                    onChange={({ target }) => handleComedienChange(index, 'role', target.value)}
                    variant="outlined" size="small" sx={textFieldStyle}
                  />
                  <IconButton
                    onClick={() => handleRemoveComedian(index)}
                    disabled={comedians.length === 1}
                    size="small"
                    color="error"
                    aria-label="Supprimer ce comédien"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddComedian}
              size="small"
              sx={{ mt: 1 }}
            >
              Ajouter un comédien
            </Button>
          </Box>
          <Button type="submit" variant="contained" sx={{ alignSelf: 'flex-start' }}>créer</Button>
        </Stack>
      </form>
    </div>
  )
}
export default PlayForm