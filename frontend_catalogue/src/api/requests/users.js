// src/api/requests/users.js
import apiClient from '../client'

export const createUser = async (newUser) => {
  const { data } = await apiClient.post('/users', newUser)
  return data
}

export const fetchUsers = async () => {
  const { data } = await apiClient.get('/users')
  return data
}