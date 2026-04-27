// src/api/artists.js
import apiClient from '../client'

export const getAll = async () => {
  const { data } = await apiClient.get('/artists')
  return data
}

export const getById = async (id) => {
  const { data } = await apiClient.get(`/artists/${id}`)
  return data
}

export const search = async (query) => {
  const { data } = await apiClient.get('/artists/search', {
    params: { q: query }
  })
  return data
}

export const create = async (newArtist) => {
  const { data } = await apiClient.post('/artists', newArtist)
  return data
}