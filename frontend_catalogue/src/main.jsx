
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter as Router } from 'react-router-dom'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { fr } from 'date-fns/locale'

createRoot(document.getElementById('root')).render(
  <Router>
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
      <App />
    </LocalizationProvider>
  </Router>
)
