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
- `nameTokens: [String]` — dérivé via hook, indexé (multikey). Tableau de tokens normalisés extraits de `name`, pour permettre des filtres « par fragment de nom » côté UI (préfixe sur n'importe quel composant : prénom, lastName, particule, nom composé) sans avoir à parser firstName/lastName depuis un nom libre
- `published: Boolean` — visibilité publique de ce profil, défaut `true`
- `alsoKnownAs: [ObjectId ref Artist]` — liens optionnels vers les autres identités de la même personne (mutuel)
- `dateOfBirth: Date` — inchangé
- `createdBy: ObjectId ref User` — inchangé

**`models/user.js`**
- `artistProfile` (singulier) → `artistProfiles: [ObjectId ref Artist]` (pluriel, tableau)

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

- `models/artist.js` — réécriture quasi complète. Plus de firstName/lastName/stageNames. Un seul `name` requis. Ajouter `sortableName`, `nameTokens`, `published`, `alsoKnownAs`.
- `models/user.js` — renommer `artistProfile` → `artistProfiles`, passer au type `[ObjectId]`.
- `models/play.js` — aucune modification.

### 2. Hooks et validation Artist

- Hook `pre('validate')` : assigne `sortableName = normalize(this.name)` et dérive `nameTokens = sortableName.split(' ').filter(Boolean)`. Plus de règle « au moins un de » à valider — Mongoose gère via `required: true` sur `name`.
- Hook anti-update sur `findOneAnd*`, `update*`, `replace*` : force les writes à passer par `findById + .save()` pour que `pre('validate')` tourne et maintienne `sortableName` et `nameTokens` à jour.

### 3. Utilitaires backend

- `utils/stringMatching.js` — refonte de `findSimilarArtists` :
  - signature plus simple : prend un seul `name` au lieu de firstName/lastName.
  - matching contre un seul champ.
  - bug pré-existant des accents à régler dans la même passe.

### 4. Controllers

#### `controllers/artists.js`
- `GET /` — sort par `{sortableName: 1, _id: 1}` (tiebreaker stable pour pagination).
- `GET /search` — regex et fonction de score sur le `name` uniquement.
- `GET /check-duplicates` — signature simplifiée à un seul paramètre `name`.
- `POST /` — accepter `name` dans le body.
- `GET /:id`, `GET /me`, `GET /:id/plays` — adapter aux nouveaux champs retournés.
- Populates : ajuster pour inclure les champs pertinents du nouveau schéma (`name` au lieu de `firstName lastName`).

#### `controllers/plays.js`
- Tous les `.populate('artists.artist', 'firstName lastName')` → `'name'` (ou `'name published'` selon besoins).
- Idem pour `director` et `createdBy` (sur User, on garde firstName/lastName du user).
- Pas de validation `billedAs` à faire — soulagement.

#### `controllers/users.js`
- `PATCH /` — gérer `artistProfiles` au pluriel. Logique add/remove sur le tableau plutôt qu'un set scalaire.
- Audit de `notifyExistingPlaysForArtist` pour qu'il itère sur chaque `artistProfiles[]` si nécessaire.

### 5. Service notifications

- `services/notifications.js` — auditer `notifyExistingPlaysForArtist` et `notifyCastChanges`. Mettre à jour pour la signature plurielle d'`artistProfiles` et le nouveau format d'Artist (un `name` au lieu de firstName+lastName).

### 6. Index Mongo

- Supprimer l'ancien index `{lastName: 1, firstName: 1, _id: 1}`.
- Index composé `{sortableName: 1, _id: 1}` pour pagination stable du directory.
- Index multikey automatique sur `nameTokens` (déclaré inline via `index: true`) pour les filtres par fragment de nom.

### 7. Frontend

- **Fonction `displayName(artist)`** centralisée. Beaucoup plus simple en v2 : retourne `artist.name`. Tu peux la garder comme point d'extension futur (ex. ajouter « (alias de…) ») sans changer les appelants.
- **Vues à mettre à jour** : `Play.jsx`, `PlayList.jsx`, `Notification.jsx`, tout endroit qui lit `artist.firstName + ' ' + artist.lastName`.
- **Formulaires** : `PlayForm.jsx` (les comédiens — un seul champ par crédit, puisque le picker pointe vers un Artist atomique), futur formulaire de création/édition d'artiste (champ `name`, éventuellement toggle `published`).
- **Picker** : Autocomplete + chips sur la base de MUI. Chaque Artist est sa propre entrée — plus de débat Option A vs B, le modèle le fait gratuitement.

### 8. Migration de données

- Tes Artists existants ont `firstName + lastName`. Stratégie : un petit script Node qui itère et écrit `name = firstName + ' ' + lastName`, puis supprime les anciens champs.
- Les `User.artistProfile` (singulier) deviennent `User.artistProfiles: [artistId]` (tableau d'un élément initialement).
- Les `Play.artists[]` n'ont pas de `billedAs` à backfiller.
- Si tu n'as pas encore d'artistes avec multiple identités dans tes données actuelles, la migration est triviale (1 Artist par Artist existant).

---

## Ordre d'exécution suggéré

1. **Schémas** (`artist.js`, `user.js`) + hooks (`pre('validate')` pour sortableName, anti-update).
2. **Script de migration** des données existantes (firstName+lastName → name; artistProfile → artistProfiles).
3. **`findSimilarArtists`** — refonte simplifiée.
4. **Endpoints artist** : reads (`GET`) d'abord, puis writes (`POST`).
5. **Endpoints play** : populates uniquement.
6. **Endpoints user** : gestion de `artistProfiles` pluriel.
7. **Service notifications** — audit + adoption de `displayName`.
8. **Frontend** : `displayName` helper en premier, puis vues, puis formulaires. Le picker en dernier (dépend de la search corrigée).

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

## Bugs et tâches connexes à traiter en cours de route

- **Bug multi-tokens dans `/search`** : « Yann m » retourne `[]` aujourd'hui (regex `^yann m` ne matche aucun champ). Avec le nouveau schéma où `name = "Yann Marguet"`, le regex `^yann m` *matche* directement. Donc le bug peut disparaître naturellement — à vérifier en testant.
- **Bug accents dans `findSimilarArtists`** : la stratégie de pré-filtrage compare la première lettre normalisée à la DB non normalisée (« Élise » vs « Elise »). À régler dans la refonte.
- **Décalage entre `PlayForm` et le schéma `play`** : le form envoie `comediens: [{firstName, lastName, role}]`, le schéma attend `artists: [{artist: ObjectId, personnage: String}]`. Le picker est ce qui résout ce décalage.

---

## Ce qui n'est PAS dans le scope de cette refonte

- Le flux self-claim (un utilisateur qui revendique un Artist qu'il n'a pas créé) — phase 2.
- Le merge admin de deux Artists qui s'avèrent être la même identité scénique (réel doublon) — phase 2.
- L'UI d'édition d'`alsoKnownAs` (gestion des liens entre alias) — phase 2.
- L'UI de gestion de `published` (toggle visibilité d'un profil) — peut venir avec le self-claim.
