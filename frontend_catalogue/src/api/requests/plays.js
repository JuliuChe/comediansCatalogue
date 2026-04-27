import apiClient from '../client'

export const getAll = async () => {
  const { data } = await apiClient.get('/plays')
  return data
}

export const getById = async (id) => {
  const { data } = await apiClient.get(`/plays/${id}`)
  return data
}

export const create = async (newPlay) => {
  const { data } = await apiClient.post('/plays', newPlay)
  return data
}

export const  updatePlay = async (id, updatedPlay) => {
  const { data } = await apiClient.put(`/plays/${id}`, updatedPlay)
  return data
}

export const deletePlay = async (id) => {
  const { data } = await apiClient.delete(`/plays/${id}`)
  return data
}
