import { Alert } from '@mui/material'

const Notification = ({ message, type }) => {
  if (message === null) {
    return null
  }

  return (
    <Alert sx={{ marginTop: 1, marginBottom: 1 }} severity={type} >
      {message}
    </Alert>

  )
}

export default Notification