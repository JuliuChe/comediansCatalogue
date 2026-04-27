import apiClient from '../client'

const createUser = async (newUser) => {
  const response = await apiClient.post('/users', newUser)
  return response.data
}

export default { createUser }