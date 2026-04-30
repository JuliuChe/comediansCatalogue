const { distance } = require('fastest-levenshtein')

const normalize = (str) => {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-'']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const similarity = (str1, str2) => {
  const n1 = normalize(str1)
  const n2 = normalize(str2)
  if (n1 === n2) return 1
  if (!n1 || !n2) return 0
  
  const maxLength = Math.max(n1.length, n2.length)
  return 1 - (distance(n1, n2) / maxLength)
}

const findSimilarArtists = async (Artist, firstName, lastName, threshold = 0.85) => {
  // Pour la perf : on récupère d'abord les candidats avec une lettre commune
  // Sinon, on serait obligé de scanner toute la collection
  const firstLetter = (firstName[0] || '').toLowerCase()
  
  const candidates = await Artist.find({
    firstName: new RegExp(`^${firstLetter}`, 'i')
  })
  
  // Puis on filtre avec la similarité
  const similar = candidates.filter(artist => {
    const firstSim = similarity(artist.firstName, firstName)
    const lastSim = similarity(artist.lastName, lastName)
    
    // Les deux noms doivent être similaires
    return firstSim >= threshold && lastSim >= threshold
  })
  
  return similar
}

function normalizeFields(obj, fields) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, fields.includes(k) ? normalize(v) : v])
  );
}

module.exports = { normalizeFields, similarity, findSimilarArtists }

