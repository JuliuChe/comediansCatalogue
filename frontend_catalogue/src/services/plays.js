import axios from 'axios'
const baseUrl = '/api/plays'
let token = null

const getAll = () => {
  const request = axios.get(baseUrl)
  return request.then(response => response.data)
}

const setToken = newToken => {
  token = `Bearer ${newToken}`
}

const create = async newPlay => {
  const config = {
    headers: { Authorization: token }
  }
  console.log(config)
  const response = await axios.post(baseUrl, newPlay, config)
  console.log(response.data)
  return  response.data
}

const updatePlay = async (id, updatedPlay) => {
  const myUrl = `${baseUrl}/${id}`
  const response = await axios.put(myUrl, updatedPlay)
  return response.data
}

const deletePlay = async (id) => {
  const myUrl = `${baseUrl}/${id}`
  const config = {
    headers: { Authorization: token }
  }
  const response = await axios.delete(myUrl, config)
  console.log(response.data)
  return response.data
}

export default { getAll, setToken, create, updatePlay, deletePlay }