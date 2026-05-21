# Backend — Roadmap

Document de planification des évolutions backend à venir.

---

## 1. Theaters — CRUD complet

### Constat initial

- `controllers/theaters.js` était un copier-coller du controller plays. Endpoints à reconstruire.
- Route à décommenter dans `app.js`.

### Décisions de design actées

- **Pattern POST** : aligné avec artists v2 (single-responsibility + endpoint `/check-duplicates` séparé), pas le pattern initial `forceCreate`. Cohérence architecturale avec le refacto artist.
- **Détection de doublons** : version simplifiée par rapport à artists. À l'échelle ~500 théâtres suisses max, scan complet + Levenshtein suffisent. Pas de trigrammes, pas de tokens.
  - Match pondéré : `nameSim * 0.7 + citySim * 0.3` si city fournie, sinon `nameSim` seul.
  - Pré-filtre par `address.sortableCity` côté DB quand city fournie (réduit le pool de candidats).
- **Authentification** :
  - `POST` / `PUT` : n'importe quel user authentifié
  - `DELETE` : seul `createdBy`
- **Multilingue suisse (Bâle/Basel, Berne/Bern, etc.)** : niveau 2 retenu pour v1.
  - Champs dérivés `sortableName` et `address.sortableCity` via hook (normalize → lowercase + accents stripped).
  - Couvre les variantes typographiques (« Bâle » vs « Bale » vs « BÂLE »).
  - **Ne couvre PAS** les alias multilingues (« Bâle » vs « Basel » restent deux strings différentes). À reprendre via une table SWISS_CITY_ALIASES en post-launch si besoin réel se manifeste.
- **UX anti-doublons côté frontend** : endpoint `GET /cities` avec dédoublonnage par sortableCity → l'utilisateur sélectionne dans une liste plutôt que de retaper, ce qui réduit les doublons à la source.

### Schéma actualisé

```js
// Theater
{
  name: { type: String, required: true },
  sortableName: { type: String, lowercase: true },   // dérivé via hook
  address: {
    street: String,
    city: { type: String, required: true },
    sortableCity: { type: String, lowercase: true }, // dérivé via hook
    postalCode: Number,
    country: String
  },
  capacity: Number,
  createdBy: { type: ObjectId, ref: 'User', required: true },
  // + timestamps: true
}
```

Plus :
- Hook `pre('validate')` qui calcule `sortableName` et `address.sortableCity` via `normalize()`
- Hook anti-update sur `findOneAnd*/update*/replace*` pour forcer le passage par `.save()`
- Index composé `{sortableName: 1, _id: 1}` pour pagination stable

### État des endpoints

- [x] `GET /api/theaters` — liste paginée, sort par `sortableName` (bug dans paginate populate : `path:createdBy` sans quotes à corriger)
- [x] `GET /api/theaters/cities?q=` — distinct sur `address.city` filtré par `sortableCity`, avec dédoublonnage par sortableCity
- [x] `GET /api/theaters/search?name=&city=` — fuzzy via `findSimilarTheaters` (seuil 0.4, limit 10)
- [ ] `GET /api/theaters/check-duplicates?name=&city=` — fuzzy via `findSimilarTheaters` (seuil 0.6, pas de limit) — **en cours**
- [x] `GET /api/theaters/:id` — détail
- [ ] `POST /api/theaters` — single responsibility (validate + check exact `sortableName` + `sortableCity` → 409 si match exact, sinon create)
- [ ] `PUT /api/theaters/:id` — auth + permission `createdBy`, validation
- [x] `DELETE /api/theaters/:id` — auth + `createdBy === userId`

### Utilitaire `findSimilarTheaters`

Vit dans `utils/stringMatching.js` (avec les autres fonctions similarité). Signature :

```js
findSimilarTheaters(Theater, {name, city}, {threshold = 0.5, limit = Infinity} = {})
```

- Early return si pas de `name` (la fonction exige un nom à chercher)
- Pré-filtre Mongo par `address.sortableCity` si city fournie
- Projection légère via `.lean()` (`'name sortableName address.city address.sortableCity'`)
- Scoring pondéré name + city (ou name seul si pas de city)
- Filtre par threshold, sort décroissant, slice à limit
- Retour : `[{id, name, city, score}]`

### Bugs résiduels à corriger

- `controllers/theaters.js` GET / : `path:createdBy` (ligne 16) sans quotes → ReferenceError au démarrage
- `controllers/theaters.js` GET /search : condition inversée `if (name.length > 2)` devrait être `< 2`
- `controllers/theaters.js` : `findSimilarTheaters` utilisé sans import explicite (à ajouter en haut du fichier)
- `controllers/theaters.js` POST + PUT : encore copier-coller du controller plays, à réécrire

### Fichiers concernés

- `backend_catalogue/models/theater.js` — ✓ schéma + hook + index
- `backend_catalogue/utils/stringMatching.js` — ✓ `findSimilarTheaters` ajoutée
- `backend_catalogue/controllers/theaters.js` — 🔄 en cours (GET endpoints faits, POST/PUT/check-duplicates à faire)
- `backend_catalogue/app.js` — vérifier que la route est bien enregistrée (typo `theatres` à corriger si toujours là)
- `frontend_catalogue/Todo.md` ligne 73 — l'inline-creation à câbler côté frontend après que l'API soit complète

---

## 2. SuggestedEdit — self-claim + corrections factuelles

Permettre à un user d'enrichir/corriger les pièces qu'il n'a pas créées :
- **Self-claim** : *"je suis cet artiste, ajoute-moi au cast/director de cette pièce"*
- **Corrections factuelles** : *"le titre est mal orthographié"*, *"la date de fin est X"*, etc.

### Décisions de design actées

- **Modèle séparé** `SuggestedEdit` (pas une extension de `Notification`).
- **Tier unique** : toute suggestion attend un `accept`/`reject` explicite du `play.createdBy`. Pas de type "info" auto-applied pour le MVP.
- **Auto-apply** sur acceptation : la mutation est appliquée au document `Play` immédiatement.
- **Pas de notif retour** : le suggesteur consulte ses propres demandes via son inbox de suggestions, il n'a pas besoin d'une notif `cast_added` quand un self-claim est accepté.
- **Withdraw** possible côté suggesteur tant que `status === 'pending'`.
- **Créateur inactif** : KISS, la suggestion reste `pending` indéfiniment. À reconsidérer en prod si ça devient un sujet (option future : auto-accept après 60-90 jours).

### Schéma proposé

```js
{
  play: { type: ObjectId, ref: 'Play', required: true },
  suggestedBy: { type: ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['self_claim', 'field_edit'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
    default: 'pending'
  },

  // Pour type === 'self_claim'
  role: { type: String, enum: ['cast', 'director'] },
  personnage: String,                            // si role === 'cast'
  artistProfile: { type: ObjectId, ref: 'Artist' },  // snapshot de l'artist au moment de la demande

  // Pour type === 'field_edit'
  field: String,                                 // 'title', 'startDate', 'theater', etc.
  proposedValue: mongoose.Schema.Types.Mixed,
  targetArtistInPlay: { type: ObjectId, ref: 'Artist' },  // si field === 'personnage' (cf. complexité ci-dessous)

  reason: String,                                // free-text optionnel
  // + timestamps
}
```

Index utile : `{ play: 1, status: 1, createdAt: -1 }` pour la query "suggestions en attente pour ma play".

### Champs éditables via `field_edit`

| Champ | Type | Complexité |
|---|---|---|
| `title` | String | trivial |
| `author` | String | trivial |
| `scriptEditor` | String | trivial |
| `url` | String | trivial |
| `startDate` | Date | trivial |
| `endDate` | Date | trivial |
| `theater` | ObjectId | le suggesteur doit fournir l'id d'un Theater existant. S'il veut un nouveau theater, il le crée d'abord via `POST /api/theaters`. |
| `artists.X.personnage` | String | **complexité bump** — il faut identifier l'entrée du cast à corriger via `targetArtistInPlay` (l'id de l'Artist), pas par index d'array. Implé à part. |

### Champs **non** éditables

- `director`, `artists` — couverts par `self_claim` (ajout). Pas d'édition générique.
- `createdBy`, `likes` — jamais.

### Endpoints

- [ ] `POST /api/suggestedEdits` — auth requise. Body selon le `type`. Validation du payload selon `type`.
- [ ] `GET /api/suggestedEdits` — auth requise. Query params :
  - `play=:id` : pour le créateur d'une play, voir les suggestions reçues
  - `suggestedBy=me` : pour le suggesteur, voir ses propres demandes
  - `status` : filtre optionnel
- [ ] `PATCH /api/suggestedEdits/:id` — body `{ status: 'accepted' | 'rejected' | 'withdrawn' }`
  - `accepted` / `rejected` → réservé à `play.createdBy`
  - `withdrawn` → réservé à `suggestedBy`
  - Sur `accepted` → **auto-apply** sur le document Play (cf. ci-dessous)

### Intégrations à câbler sur acceptation

- **`self_claim` accepté** :
  1. Si `role === 'cast'` : push `{ artist: artistProfile, personnage }` dans `play.artists`
  2. Si `role === 'director'` : set `play.director = artistProfile` (potentiellement écrase l'existant — à clarifier UX)
  3. `play.save()`
  4. Appeler `notifyCastChanges(oldPlay, newPlay)` du service notifications, pour respecter le pipeline existant
- **`field_edit` accepté** :
  1. Pour les champs simples : `play[field] = proposedValue`, save
  2. Pour `personnage` : retrouver l'entrée dans `play.artists` par `targetArtistInPlay`, set son `personnage`, save
  3. Pas d'appel à `notifyCastChanges` (le cast ne change pas)

### Question UX différée

Sur `director` self-claim, si la play a déjà un director défini : on écrase silencieusement ? On refuse la suggestion côté validation ? On exige du créateur qu'il choisisse ? À traiter au moment de l'implé.

### Fichiers à créer

- `backend_catalogue/models/suggestedEdit.js`
- `backend_catalogue/controllers/suggestedEdits.js`
- `backend_catalogue/services/suggestedEdits.js` (pour la logique d'auto-apply)
- `backend_catalogue/app.js` — register la route

### Note sur le frontend

À ajouter dans `frontend_catalogue/ROADMAP.md` quand cette section sera lancée : une UI pour soumettre une suggestion (sur la page d'une play, un bouton *"suggérer une correction"* / *"je suis dans cette pièce"*), et une UI pour le créateur de play pour voir et trancher ses suggestions reçues (potentiellement intégré à l'inbox existante, ou onglet séparé).

---

## 3. Like endpoint pour Play

Permettre aux utilisateurs connectés de "liker" une pièce comme indicateur public de popularité.

### Constat

- Le champ `likes: Number` existe déjà sur le schéma Play mais aucun endpoint ne le manipule (sauf qu'on peut le passer dans le PUT, ce qui n'a aucun usage réel).
- Aucune attribution : on ne sait pas QUI a liké → pas de prévention du double-like → le nombre est arbitraire.

### Décisions à prendre

**Modèle de stockage** :

| Option | Forme | Pour | Contre |
|---|---|---|---|
| (a) | `Play.likedBy: [ObjectId ref User]` | Simple, idempotence triviale via `$addToSet`/`$pull`. Un seul document à toucher. | Document Play devient "hot" si beaucoup de likes. Limite hard de 16MB par doc (largement OK pour ce volume). |
| (b) | Collection séparée `Like { play, user, createdAt }` avec unique index `{ play, user }` | Plus scalable, plus propre pour analytics futurs ("qui a liké quoi quand", "top likers"). | Plus de code, deux requêtes pour afficher count + statut user. |

**Recommandation MVP** : **(a)** sauf si tu prévois explicitement des analytics par user-liker. Tu peux migrer vers (b) plus tard (script ponctuel `Play.likedBy → Like.create({ play, user })`).

### Endpoints (sur la base de l'option a)

- [ ] `POST /api/plays/:id/like` — auth requise, idempotent (`$addToSet`). Retourne `{ likesCount, likedByCurrentUser: true }`.
- [ ] `DELETE /api/plays/:id/like` — auth requise, idempotent (`$pull`). Retourne `{ likesCount, likedByCurrentUser: false }`.
- [ ] Enrichir `GET /api/plays/:id` et `GET /api/plays` :
  - Renvoyer `likesCount` (computed depuis `likedBy.length`, via virtual ou projection)
  - Renvoyer `likedByCurrentUser: boolean` si user authentifié, `false` sinon

### Migration

- Champ `likes: Number` actuel → déprécié. Le retirer du schéma quand la migration est en place.
- Script ponctuel : initialiser `likedBy: []` sur les plays existantes (les valeurs `likes: 0` actuelles sont triviales à drop).

### À confirmer

- (a) vs (b) : laquelle on retient pour le MVP ?

---

## Ordre suggéré

1. **Theaters CRUD** d'abord — c'est concret, bloque l'inline-creation côté frontend, et débloque l'autocomplete proprement.
2. **Like endpoint** ensuite — petit, autonome, "easy win". Bon palier d'apprentissage entre theaters et suggestedEdit.
3. **SuggestedEdit** en dernier — le plus gros morceau, qui réutilise ce qu'on a posé (notifications, structure d'auth, pattern de validation).
