const mongoose = require('mongoose')

// Encode/décode le curseur en base64 pour le rendre opaque
const encodeCursor = (obj) =>
  Buffer.from(JSON.stringify(obj)).toString('base64url')

const decodeCursor = (str) => {
  try {
    return JSON.parse(Buffer.from(str, 'base64url').toString())
  } catch {
    return null
  }
}


const paginate = async (model, {
  filter = {},
  limit = 50,
  cursor = null,
  sort = { _id: 1 },
  projection = null,
  populate = null,
} = {}) => {
  const finalFilter = { ...filter }

  // On s'assure que _id est toujours dans le tri (tie-breaker)
  const sortKeys = Object.keys(sort)
  const sortWithId = sortKeys.includes('_id') 
    ? sort 
    : { ...sort, _id: sort[sortKeys[sortKeys.length - 1]] || 1 }

 // Construction du filtre de curseur
  if (cursor) {
    const decoded = decodeCursor(cursor)
    if (!decoded) {
      const err = new Error('Invalid cursor')
      err.status = 400
      throw err
    }

    // Construit la condition $or pour un curseur composite
    // Ex: sort = { lastName: 1, firstName: 1, _id: 1 }
    // → où (lastName > X) OU (lastName = X ET firstName > Y) OU (lastName = X ET firstName = Y ET _id > Z)
    const keys = Object.keys(sortWithId)
    const orConditions = keys.map((_, i) => {
      const condition = {}
      // Égalité sur tous les champs précédents
      for (let j = 0; j < i; j++) {
        condition[keys[j]] = decoded[keys[j]]
      }
      // Stricte inégalité sur le champ courant (selon l'ordre du tri)
      const direction = sortWithId[keys[i]]
      const operator = direction === 1 ? '$gt' : '$lt'
      condition[keys[i]] = { [operator]: decoded[keys[i]] }
      return condition
    })

    finalFilter.$or = finalFilter.$or
      ? [...finalFilter.$or, ...orConditions] // attention si déjà présent
      : orConditions
  }

  let query = model
    .find(finalFilter, projection)
    .sort(sort)
    .limit(limit + 1)

    // ✨ Support de populate multiple
  if (populate) {
    if (Array.isArray(populate)) {
      // Plusieurs populates : on les enchaîne
      for (const pop of populate) {
        query = query.populate(pop)
      }
    } else {
      // Un seul populate (objet ou string)
      query = query.populate(populate)
    }
  }

  const results = await query.lean()

  const hasMore = results.length > limit
  const data = hasMore ? results.slice(0, -1) : results

  // Construction du next_cursor à partir du dernier élément
  let nextCursor = null
  if (hasMore && data.length > 0) {
    const last = data[data.length - 1]
    const cursorData = {}
    for (const key of Object.keys(sortWithId)) {
      cursorData[key] = last[key]
    }
    nextCursor = encodeCursor(cursorData)
  }
  return {
    data,
    pagination: {
      next_cursor: nextCursor,
      has_more: hasMore,
      limit,
    },
  }
}


module.exports = paginate