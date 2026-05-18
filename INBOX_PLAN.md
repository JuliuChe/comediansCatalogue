# Feature Inbox — État et plan restant

Document de reprise pour continuer la feature "inbox de notifications" dans une nouvelle session.

## Statut au 2026-05-16

- [x] **Étape 1** — Modèle `Notification` créé (`backend_catalogue/models/notification.js`). Index unique sur `(recipient, play, artist, role)` après bascule en mode "2 notifs".
- [x] **Étape 2** — Service `notifyCastChanges(oldPlay, newPlay)` câblé dans `controllers/plays.js` POST (avec `oldPlay = null`) et PUT (avec snapshot avant mutations). Testé OK : cast, director, cast+director sur la même personne, idempotence sur PUT, PUT sans changement de cast.
- [~] **Étape 3** — Service `notifyExistingPlaysForArtist(recipientId, artistId)` écrit dans `services/notifications.js`. **Reste à câbler le hook dans `controllers/users.js` PATCH /me** (cf. ci-dessous).
- [ ] **Étape 4** — Endpoints API `/notifications`
- [ ] **Étape 5** — Filtrage du profil public (exclure les pièces non acceptées)
- [ ] **Étape 6** — Frontend inbox (page + badge compteur)

## Finir l'étape 3 (à faire en priorité au redémarrage)

Dans `controllers/users.js` `PATCH /me`, appliquer le pattern snapshot → mutation → save → hook conditionnel :

```js
const oldArtistProfile = user.artistProfile           // SNAPSHOT avant mutation

// validations + mutations existantes...
if (artistId !== undefined) {
  const artist = await Artist.findById(artistId)
  if (!artist) return response.status(404).json({ error: 'artist id does not exist' })
  user.artistProfile = artistId
}
// ... autres champs ...

const updatedUser = await user.save()

// HOOK après save, seulement si vraiment changé ET non-null
const oldId = oldArtistProfile?.toString() ?? null
const newId = user.artistProfile?.toString() ?? null
if (newId && newId !== oldId) {
  await notifyExistingPlaysForArtist(user._id, user.artistProfile)
}

response.json(updatedUser)
```

Import à ajouter : `const { notifyExistingPlaysForArtist } = require('../services/notifications')`

### Tests étape 3 à valider

1. Drop la collection `notifications` + restart serveur pour partir propre
2. PATCH /me avec `artistId` valide vers un artiste **présent dans 2+ pièces** → 2 notifs `pending` créées
3. PATCH /me avec le **même** artistId → 0 nouvelles notifs (pas de changement, le `if (newId !== oldId)` skip)
4. PATCH /me avec `artistId: null` → 0 nouvelles notifs (newId null, le `if` skip)
5. PATCH /me qui change vers un AUTRE artistId → notifs créées pour le nouveau (anciennes laissées en place, cf. décision (a) ci-dessous)

## Étape 4 — Endpoints API `/notifications`

Créer `controllers/notifications.js` avec :

- `GET /api/notifications` (auth requise) → liste les notifs du user connecté, paramètre query `status` optionnel (par défaut `pending`), trié par `createdAt` desc. Populer `play` (au moins title, startDate) et `artist` (firstName, lastName) pour l'affichage.
- `PATCH /api/notifications/:id` (auth requise) → permet uniquement au `recipient` de modifier `status`. Accepte body `{ status: 'accepted' | 'rejected' }`. Refuser toute autre transition (sécurité : un user ne peut pas modifier les notifs d'un autre).

À enregistrer dans `app.js` : `app.use('/api/notifications', notificationsRouter)`.

## Étape 5 — Filtrage du profil public

L'endpoint qui liste les pièces d'un artiste (probablement `GET /api/artists/:id/plays` qui utilise déjà `findPlaysByArtistId`) doit filtrer pour ne montrer **que les pièces dont le user-owner a accepté**.

Logique :
1. Trouver le User dont l'`artistProfile` est cet artistId
2. Si pas de User lié → afficher toutes les pièces (aucune curation possible)
3. Si User lié → joindre avec les notifications `accepted` pour ce user, ne garder que ces pièces

Question UX à reprendre : doit-on filtrer **les rôles** indépendamment (par exemple cacher la pièce uniquement comme cast mais la montrer comme director) ? Réfléchir à ça à ce moment-là.

## Étape 6 — Frontend inbox

- Route protégée `/inbox` accessible seulement si `userContext` connecté
- Composant Inbox qui appelle `GET /api/notifications` via `useQuery` (TanStack Query, vu dans `src/hooks/queries/`)
- Affichage : liste de cartes avec titre de la pièce, rôle, date, boutons Accept/Reject
- Action Accept/Reject → `PATCH /api/notifications/:id` puis invalidation de la query (pour refresh)
- Badge compteur dans le header : nombre de notifs `pending` (peut être une query séparée `GET /api/notifications?status=pending` puis `.length`)

## Décisions de design actées

- **Opt-in** : par défaut, les pièces sont **cachées** du profil public tant que la notif est `pending`. Le user choisit de les rendre visibles via accept.
- **2 notifs** si le même artiste est à la fois cast ET director sur la même pièce. Index unique sur `(recipient, play, artist, role)`.
- **Idempotence** : insertion de notif duplicate (même quadruplet) est silencieusement ignorée via catch sur `err.code === 11000`.
- **Cas changement d'artistProfile** : on **laisse en place** les anciennes notifs (option (a)). Pas de cleanup. C'est l'inbox du user, à lui de faire le ménage.
- **Cas removal d'un artist d'une pièce** : pour l'instant, **pas de gestion**. Le statut `'withdrawn'` est défini dans le schéma mais jamais attribué. À ajouter en phase 2 si le besoin se fait sentir.

## Différé (phase 2)

- **Self-claim flow** via `SuggestedEdit` : permettre à un user-artiste de demander à être ajouté à une pièce qu'il n'a pas créée. Le créateur valide via notif. Cf. memory `project_deferred_self_claim_flow.md`.
- **Statut `withdrawn`** : marquer les notifs comme retirées quand l'artist est sorti du cast/director d'une pièce.
- **Roles indépendants au filtrage** : potentiellement permettre accept comme director mais reject comme cast (granularité par rôle).

## Fichiers concernés

Backend :
- `backend_catalogue/models/notification.js` ✓ existe
- `backend_catalogue/services/notifications.js` ✓ existe (les 2 fonctions)
- `backend_catalogue/services/artists.js` ✓ existe (`findPlaysByArtistId` réutilisé)
- `backend_catalogue/controllers/plays.js` ✓ câblé POST + PUT
- `backend_catalogue/controllers/users.js` ⚠ hook PATCH /me à finir
- `backend_catalogue/controllers/notifications.js` ⬜ à créer (étape 4)
- `backend_catalogue/app.js` ⬜ à enregistrer la route (étape 4)
- `backend_catalogue/controllers/artists.js` ⬜ à modifier pour le filtrage (étape 5)

Frontend (étape 6) :
- `frontend_catalogue/src/components/Inbox.jsx` ⬜ à créer
- `frontend_catalogue/src/api/requests/notifications.js` ⬜ à créer
- `frontend_catalogue/src/hooks/queries/useNotifications.js` ⬜ à créer
- Route dans `src/App.jsx` à ajouter
- Badge dans le header (composant qui n'existe pas encore visiblement → à créer ou à coller dans le Layout actuel)
