import apiClient from '../client'


export const login = async (credentials) => {
  const {data}= await apiClient.post('/login', credentials)
  if(data.token){
    localStorage.setItem('token', data.token)
  }
  return data
}

export const logout = () => {
  localStorage.removeItem('token')
}

export default { login }