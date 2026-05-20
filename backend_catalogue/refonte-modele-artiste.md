# Refonte du modèle Artiste — Plan (v2)

> **Note** : ce plan a été pivoté après itération sur le design.
> La version v1 (un Artist = une personne avec plusieurs noms) a été remplacée par la v2 (un Artist = une identité scénique atomique, un user peut en avoir plusieurs).
> Voir l'historique git pour la v1.

## Contexte

Le modèle initial (firstName + lastName tous deux requis) ne tenait pas pour :
- les artistes connus uniquement par un nom de scène (« Raclor »)
- les artistes ayant plusieurs identités scéniques (Arnaud Mathey alias Raclor *et* Chouchou)

Après itération autour d'un modèle « un Artist = une personne avec plusieurs noms », on bascule sur le modèle plus simple **« un Artist = une identité scénique »**. Chaque alias (nom civil, nom de scène) est un Artist distinct. Un User peut être lié à plusieurs Artists.

Cette refonte vise un catalogue plus fidèle à la réalité de la scène culturelle, sans charge de maintenance post-launch sur la détection de doublons.

---

## État d'avancement

### Terminé

- **Schémas** `models/artist.js` (avec name, sortableName, nameTokens, nameTrigrams, published, alsoKnownAs) et `models/user.js` (artistProfiles au pluriel)
- **Hooks** `pre('validate')` (maintien de sortableName, nameTokens, nameTrigrams) et anti-update (regex sur findOneAnd*/update*/replace*)
- **Indexes Mongo** : `{sortableName: 1, _id: 1}` sur Artist, multikey sur nameTokens et nameTrigrams, `artistProfiles` unique+sparse sur User
- **Migration** des données existantes via `scripts/migrate-artists.js` (firstName + lastName → name ; les champs dérivés sont calculés par le hook au save)
- **Suppression de firstName/lastName en DB** via mongosh `$unset`
- **Utilitaires** dans `utils/stringMatching.js` : `normalize`, `similarity`, `getTrigrams`, `tokenLevelSimilarity`, `findSimilarArtists`
- **Endpoints** :
  - `GET /artists/` (sort par sortableName) ✓
  - `POST /artists/` (accepte `name`, vérifie doublons via findSimilarArtists, mécanisme forceCreate côté frontend à implémenter) ✓
  - `GET /artists/check-duplicates?name=...` (400 si name manquant, retourne array `[{id, name, score}]`) ✓

### En cours / à faire

- **`GET /artists/search`** : à refondre avec la nouvelle infrastructure
- **`GET /artists/me`** : adapter à `User.artistProfiles` pluriel (actuellement référence `user.artistProfile` singulier qui n'existe plus)
- **`GET /artists/:id/plays`** : même problème — référence `user.artistProfile` et `User.findOne({artistProfile: ...})`
- **Schéma `models/artist.js`** : retirer les déclarations firstName/lastName (encore là, transitionnel — fini d'utiliser mais pas supprimé du schéma)
- **`controllers/plays.js`** : populates (`'firstName lastName'` → `'name'`) à tous les endroits
- **`controllers/users.js`** : PATCH /me — gérer artistProfiles comme tableau (add/remove plutôt qu'un set scalaire)
- **`services/notifications.js`** : audit (notifyExistingPlaysForArtist, notifyCastChanges) et adaptation à artistProfiles pluriel
- **Frontend** : `displayName` helper, vues, formulaires, picker (cf. `frontend_catalogue/ROADMAP.md`)

---

## Décisions de design

### Vision conceptuelle

**Un Artist est une identité scénique atomique.** Chaque profil porte un nom unique. Une personne réelle peut être représentée par plusieurs Artists dans le catalogue.

Conséquences concrètes :
- Arnaud Mathey est un Artist (`name: "Arnaud Mathey"`)
- Raclor est un autre Artist (`name: "Raclor"`)
- Chouchou est un troisième Artist (`name: "Chouchou"`)
- Tous trois peuvent être liés au même User via `User.artistProfiles` (au pluriel)
- Chaque profil a sa propre page, sa propre visibilité, son propre sort alphabétique

### Schémas cibles

**`models/artist.js`**
- `name: String` — **requis**, le nom de cette identité, affiché tel quel
- `sortableName: String` — dérivé via hook, indexé, alimenté par `normalize(name)`
- `nameTokens: [String]` — dérivé via hook, indexé (multikey). Tableau de tokens normalisés extraits de `name`. Sert au **scoring fin token-par-token** (via `tokenLevelSimilarity`) et aux filtres « par fragment de nom » côté UI.
- `nameTrigrams: [String]` — dérivé via hook, indexé (multikey). Tableau de trigrammes (séquences de 3 caractères) de chaque token. Sert de **pré-filtre rapide indexable** pour la détection de doublons et la search à grande échelle (~200k Artists potentiels pour la scène culturelle suisse).
- `published: Boolean` — visibilité publique de ce profil, défaut `true`
- `alsoKnownAs: [ObjectId ref Artist]` — liens optionnels vers les autres identités de la même personne (mutuel)
- `dateOfBirth: Date` — inchangé
- `createdBy: ObjectId ref User` — inchangé

**`models/user.js`**
- `artistProfile` (singulier) → `artistProfiles: [ObjectId ref Artist]` (pluriel, tableau)
- Index `{artistProfiles: 1}` avec `unique: true, sparse: true` pour garantir qu'un Artist ne peut être lié qu'à un seul User

**`models/play.js`** — aucune modification structurelle
- `artists[i] = { artist: ObjectId, personnage: String }` — inchangé
- **Pas de `billedAs`** : le `ref` Artist EST le crédit. Si la pièce a été jouée en tant que Raclor, on pointe vers l'Artist Raclor.

### Pourquoi `billedAs` disparaît

Dans la v1, on stockait sur la Play « quel nom de l'artiste était crédité ». Dans la v2 c'est implicite : on pointe directement vers l'Artist correspondant. Pas de duplication, pas de validation de cohérence à faire, pas de risque de désynchronisation.

### Le lien entre alias (`alsoKnownAs`)

- Pour les artistes-users : le lien existe naturellement via `User.artistProfiles`. `alsoKnownAs` peut être maintenu en parallèle pour faciliter les requêtes côté Artist.
- Pour les artistes sans user account (la majorité au launch) : `alsoKnownAs` doit être renseigné explicitement par un curator/admin. Reste optionnel.

L'utilité : pages profil (« cet artiste joue aussi sous : X, Y »), SEO (liens internes entre pages d'un même humain), navigation.

---

## Inventaire des changements

### 1. Schémas

- `models/artist.js` — réécriture complète. Plus de firstName/lastName/stageNames. Un seul `name` requis. Champs dérivés : `sortableName`, `nameTokens`, `nameTrigrams`. Plus : `published`, `alsoKnownAs`.
- `models/user.js` — `artistProfile` → `artistProfiles: [ObjectId]` + index unique sparse.
- `models/play.js` — aucune modification.

### 2. Hooks et validation Artist

- Hook `pre('validate')` : assigne `sortableName = normalize(this.name)`, dérive `nameTokens = sortableName.split(' ').filter(Boolean)`, puis calcule `nameTrigrams = getTrigrams(nameTokens)`. Plus de règle « au moins un de » à valider — Mongoose gère via `required: true` sur `name`.
- Hook anti-update sur `findOneAnd*`, `update*`, `replace*` : force les writes à passer par `findById + .save()` pour que `pre('validate')` tourne et maintienne les trois champs dérivés à jour.

### 3. Utilitaires backend (`utils/stringMatching.js`)

**Fonctions exposées** :

- `normalize(str)` — lowercase + suppression des accents (NFD + retrait des combining marks) + remplacement tirets/apostrophes par espaces + collapse des espaces multiples + trim.
- `similarity(str1, str2)` — distance de Levenshtein normalisée par la longueur max, retourne un nombre entre 0 et 1. Inputs normalisés en interne.
- `getTrigrams(tokens)` — pour chaque token, extrait toutes les sous-chaînes de longueur 3 ; aplati en un tableau unique. Les tokens < 3 caractères ne contribuent rien (cas voulu pour les particules « de », « la »).
- `tokenLevelSimilarity(inputTokens, candidateTokens)` — pour chaque token d'input, trouve son **meilleur match** parmi les tokens du candidat (similarity max). Agrège via moyenne pondérée par la longueur du token d'input. Retourne 0 si inputTokens est vide. Cette approche est **résistante à l'inversion d'ordre** (« Marguet Yann » matche « Yann Marguet » à 100 %).
- `findSimilarArtists(Artist, name, threshold = 0.5)` — orchestrateur principal :
  1. Normalise + tokenise + trigrammise l'input
  2. Pré-filtre les candidats via index multikey sur `nameTrigrams` (`$in`)
  3. Limite à 1000 candidats max (garde-fou perf)
  4. Calcule `tokenLevelSimilarity` pour chaque candidat
  5. Filtre par seuil, trie par score décroissant
  6. Retourne `[{id, name, score}]`

**Le bug pré-existant des accents est résolu naturellement** : les trigrammes sont calculés à partir de `sortableName`, lui-même normalisé sans accents. « Élise » et « Elise » génèrent les mêmes trigrammes → match parfait au pré-filtre.

**Limite assumée** : si tous les tokens de l'input ont des typos *différents* qui changent aussi leurs trigrammes (« Yaun Haug » vs « Yannick Huguet »), le pré-filtre rate. C'est rare et c'est le filet du merge admin en phase 2 qui rattrape les rares cas.

### 4. Controllers

#### `controllers/artists.js`

- `GET /` — sort par `{sortableName: 1, _id: 1}` ✓ fait
- `GET /search` — **à refondre** avec la nouvelle infra :
  - Approche : réutiliser `findSimilarArtists(Artist, q, 0.3)` avec un seuil plus permissif que check-duplicates (le user tape, on est tolérant)
  - Limiter à top 10 résultats
  - Garder l'early return `[]` pour les queries < 2 caractères
  - Le pré-filtre par trigrammes résout naturellement le bug multi-tokens (« Yann m » trouve « Yann Marguet » via les trigrammes partagés)
  - Retour : tableau `[{id, name, score}]` — même shape que check-duplicates, le frontend peut afficher le score si pertinent
- `GET /check-duplicates?name=...` — 400 si manquant/vide, retourne array `[{id, name, score}]` ✓ fait
- `POST /` — accepte `name`, vérifie doublons (avec mécanisme `forceCreate` à raccorder au frontend) ✓ fait
- `GET /me` — **à adapter** : `user.artistProfile` → `user.artistProfiles?.length > 0`, retourner *tous* les profils + leurs pièces (ou laisser le frontend choisir un profil par défaut)
- `GET /:id` — pas de changement structurel, juste vérifier que le retour expose `name` et pas firstName/lastName
- `GET /:id/plays` — **à adapter** : `User.findOne({ artistProfile: id })` → `User.findOne({ artistProfiles: id })` (Mongoose matche les éléments du tableau naturellement)
- Populates : ajuster pour `'name'` (au lieu de `'firstName lastName'`)

#### `controllers/plays.js`

- Tous les `.populate('artists.artist', 'firstName lastName')` → `'name'` (4+ occurrences à mettre à jour)
- Idem pour `.populate('director', 'firstName lastName')` → `'name'`
- `createdBy` (qui pointe sur User, pas sur Artist) reste avec firstName/lastName du user
- Pas de validation `billedAs` à faire — soulagement

#### `controllers/users.js`

- `PATCH /` — gérer `artistProfiles` au pluriel. Choisir entre :
  - Logique add/remove explicite (clé `addArtistProfile` / `removeArtistProfile` dans le body)
  - Ou set complet du tableau (le body envoie la liste complète d'artistIds)
- Audit de `notifyExistingPlaysForArtist` pour qu'il itère si nécessaire sur le nouveau tableau

### 5. Service notifications

- `services/notifications.js` — auditer `notifyExistingPlaysForArtist` et `notifyCastChanges`. Mettre à jour pour la signature plurielle d'`artistProfiles` et le nouveau format d'Artist (un `name` au lieu de firstName+lastName) pour le texte des notifications éventuelles.

### 6. Index Mongo

- ✓ Ancien index `{lastName: 1, firstName: 1, _id: 1}` supprimé (n'existe plus avec le nouveau schéma)
- ✓ Index composé `{sortableName: 1, _id: 1}` pour pagination stable du directory
- ✓ Index multikey automatique sur `nameTokens` (déclaration inline)
- ✓ Index multikey automatique sur `nameTrigrams` (déclaration inline) — crucial pour la perf du pré-filtre dans findSimilarArtists
- ✓ Index `{artistProfiles: 1}` unique + sparse sur User

### 7. Frontend

Plan détaillé dans `frontend_catalogue/ROADMAP.md`. Résumé :

- **Fonction `displayName(artist)`** centralisée : retourne `artist.name`.
- **Vues à mettre à jour** : `Play.jsx`, `PlayList.jsx`, `Notification.jsx`, tout endroit qui lisait `artist.firstName + ' ' + artist.lastName`.
- **Création d'Artist avec détection de doublons** : machine à états (`idle` → `checking` → `reviewing` → `creating` → `done`) + modale de revue des candidats avec lazy fetch des pièces de chaque candidat (Option A).
- **Picker dans PlayForm** : Autocomplete + chips MUI. Chaque Artist est sa propre entrée.

### 8. Migration de données

- ✓ Script `scripts/migrate-artists.js` exécuté : firstName + lastName → name pour tous les Artists existants
- ✓ Champs dérivés (sortableName, nameTokens, nameTrigrams) calculés au save via le hook
- ✓ Suppression de firstName/lastName en DB via `$unset`
- Reste à faire : retirer firstName/lastName de la déclaration du schéma `models/artist.js`

---

## Ordre d'exécution suggéré (mis à jour)

1. ✓ **Schémas** (`artist.js`, `user.js`) + hooks
2. ✓ **Migration** des données existantes
3. ✓ **`findSimilarArtists`** + utilitaires (`getTrigrams`, `tokenLevelSimilarity`)
4. ✓ **`POST /artists`** + **`GET /artists/check-duplicates`** + **`GET /artists/`** (sort)
5. 🔄 **`GET /artists/search`** (en cours)
6. 🔜 **`GET /artists/me`** et **`GET /artists/:id/plays`** (adaptation artistProfiles pluriel)
7. 🔜 **Schéma artist** : retrait des champs firstName/lastName transitoires
8. 🔜 **`controllers/plays.js`** : populates
9. 🔜 **`controllers/users.js`** : PATCH /me avec artistProfiles tableau
10. 🔜 **`services/notifications.js`** : audit
11. 🔜 **Frontend** : `displayName` helper, vues, formulaires, picker

---

## Décisions UX en suspens

### Le picker côté frontend

Composant typeahead + chips (style Gmail), basé sur `<Autocomplete multiple>` de MUI. Chaque Artist apparaît comme une entrée distincte — pas de gymnastique multi-rangées pour un même artiste.

**Question à trancher** : que se passe-t-il si l'utilisateur tape un nom qui n'existe pas ?
- **Option A** : silence, doit choisir dans la liste.
- **Option B** : afficher « + Créer un nouvel artiste » en bas de la dropdown, qui ouvre un dialog branchant sur le flux `/check-duplicates` puis `POST /artists`.

Recommandation : commencer par **A**, ajouter **B** dans un second temps.

### Affichage des liens entre alias

Sur la page profil d'un Artist, afficher la liste des `alsoKnownAs` (« cet artiste joue aussi sous : Raclor, Chouchou ») avec liens internes vers chaque profil. Utile pour la navigation et pour la SEO.

L'édition de `alsoKnownAs` (qui peut linker quoi) est en phase 2.

---

## Bugs et tâches connexes — statut

- ✓ **Bug multi-tokens dans `/search`** : résolu naturellement par le nouveau schéma + nouvelle algo. « Yann m » trouve « Yann Marguet » via les trigrammes partagés et le scoring token-level.
- ✓ **Bug accents dans `findSimilarArtists`** : résolu — les trigrammes sont calculés sur `sortableName` (normalisé sans accents). « Élise » et « Elise » matchent.
- 🔄 **Décalage entre `PlayForm` et le schéma `play`** : encore à traiter avec l'implémentation du picker frontend. Le picker pointera vers des Artist par leur `_id` et le payload submit sera aligné avec `play.artists[i] = { artist: ObjectId, personnage }`.

---

## Ce qui n'est PAS dans le scope de cette refonte

- Le flux self-claim (un utilisateur qui revendique un Artist qu'il n'a pas créé) — phase 2.
- Le merge admin de deux Artists qui s'avèrent être la même identité scénique (réel doublon) — phase 2.
- L'UI d'édition d'`alsoKnownAs` (gestion des liens entre alias) — phase 2.
- L'UI de gestion de `published` (toggle visibilité d'un profil) — peut venir avec le self-claim.
