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

const getTrigrams = (tokens) => {
  const resultTrigrams = tokens.flatMap( tok => {
    let trigrams = []
    for (let i = 0; i+3<=tok.length;i++){
      trigrams.push(tok.slice(i,i+3))
    }
    return trigrams
  })
  return resultTrigrams
}

const findSimilarArtists = async (Artist, artistNameToFind, threshold = 0.5) => {
  
  const searchableTokens = normalize(artistNameToFind).split(' ').filter(Boolean)
  const searchableTrigrams = getTrigrams(searchableTokens)
  const candidates = await Artist.find({nameTrigrams: { $in: searchableTrigrams}}, 'name nameTokens').limit(1000).lean()
  const similar = candidates
    .map( (cand) => ({cand, score: tokenLevelSimilarity(searchableTokens, cand.nameTokens)}))
    .filter( ({score}) => score>threshold)
    .sort((a,b) => b.score - a.score)
    .map(({cand, score}) => ({
      id:cand._id,
      name:cand.name,
      score
    }))
  
  return similar
}

const tokenLevelSimilarity = (inputTokens, candidateTokens) =>{
  let weightedScore = 0
  let totalLength = 0
  if (inputTokens.length===0) return 0
  for ( const inTok of inputTokens){
    //const bestCandidateMatch = {token:candidateTokens[0], score:0} 
    const bestLocalScore = 0
    for (const candTok of candidateTokens){
      const localScore = similarity(inTok, candTok) 
      if(localScore>bestCandidateMatch.score){
        //bestCandidateMatch.token=candTok
        //bestCandidateMatch.score = localScore
        bestLocalScore = localScore
      }
    }
    totalLength+=inTok.length
    // weightedScore+=bestCandidateMatch.score*inTok.length
    weightedScore+=bestLocalScore*inTok.length
  }
  return weightedScore/totalLength
}

function normalizeFields(obj, fields) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, fields.includes(k) ? normalize(v) : v])
  );
}

module.exports = { normalizeFields, similarity, findSimilarArtists, normalize }

