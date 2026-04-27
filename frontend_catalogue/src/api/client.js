import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Intercepteur pour ajouter le token JWT à chaque requête
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Intercepteur pour gérer les erreurs globalement
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si le token est expiré ou invalide, déconnecter l'utilisateur
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      // Optionnel : rediriger vers login
      // window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient