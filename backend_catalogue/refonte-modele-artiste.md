# Refonte du modèle Artiste — Plan

## Contexte

Le modèle actuel (`firstName` + `lastName` tous deux requis) ne tient pas pour :
- les artistes connus uniquement par un nom de scène (« Raclor »)
- les artistes qui ont plusieurs identités scéniques (Arnaud Mathey alias Raclor *et* Chouchou)

Cette refonte vise un catalogue plus fidèle à la réalité de la scène culturelle, sans charge de maintenance post-launch sur la détection de doublons.

## Décisions de design

### Vision conceptuelle

**Un artiste est une personne**, pas une identité scénique. Un seul document `Artist` peut porter plusieurs noms (nom civil + noms de scène).

### Schéma cible

**`models/artist.js`**
- `firstName: String` — optionnel
- `lastName: String` — optionnel
- `stageNames: [String]` — tableau, possiblement vide
- `dateOfBirth: Date` — inchangé
- `createdBy: ObjectId ref User` — inchangé
- **Validation custom** : au moins un de (`lastName`, `stageNames`) doit être présent. `firstName` seul n'identifie pas.

**`models/play.js`** — sous-document `artists[]` enrichi
- `artist: ObjectId ref Artist` — inchangé
- `personnage: String` — inchangé (le rôle dans la pièce)
- **`billedAs: String` (nouveau)** — le nom utilisé sur l'affiche pour cette pièce. Doit appartenir à la liste des noms de l'Artist référencé.

### Pourquoi `billedAs` sur la Play et pas seulement sur l'Artist

Quand Arnaud Mathey monte un spectacle en tant que Chouchou, c'est une proposition artistique différente d'un spectacle d'Arnaud Mathey. Effacer cette distinction dans le catalogue, c'est passer à côté de l'identité de la performance. La SEO bénéficie aussi de pages publiques qui affichent le nom de scène utilisé.

---

## Inventaire des changements

### 1. Schémas

- `models/artist.js` — restructurer firstName/lastName en optionnels, ajouter `stageNames`, valider la règle d'unicité de présence.
- `models/play.js` — ajouter `billedAs` dans le sous-document `artists`.

### 2. Utilitaires backend

- `utils/stringMatching.js` — refonte de `findSimilarArtists` :
  - la stratégie actuelle (filtrer par première lettre du firstName) ne tient plus.
  - Stratégie possible : un champ dérivé `searchableNames` indexé (concaténation de firstName/lastName/stageNames normalisés), ou repenser le pré-filtre.
  - Le bug pré-existant des accents (« Élise » vs « Elise ») est à régler dans la même passe.

### 3. Controllers

#### `controllers/artists.js`
- `GET /` — stratégie de tri à revoir (l'index `{lastName:1, firstName:1}` n'est plus optimal quand beaucoup d'artistes n'ont pas de lastName).
- `GET /search` — regex et fonction de score doivent inclure `stageNames`. À régler en même temps que le bug multi-tokens (« Yann m » qui ne retourne rien).
- `GET /check-duplicates` — signature à élargir pour accepter `stageName` en plus de `firstName`/`lastName`.
- `POST /` — accepter `stageNames` dans le body, valider la règle métier.
- `GET /:id`, `GET /me`, `GET /:id/plays` — vérifier la cohérence des champs retournés.

#### `controllers/plays.js`
- Tous les `.populate('artists.artist', ...)` et `.populate('director', ...)` doivent inclure `stageNames`.
- `POST /` et `PATCH /:id` — validation du `billedAs` : doit appartenir à la liste des noms de l'Artist référencé.

#### `controllers/users.js`
- `PATCH /` — le rattachement `user.artistProfile` reste similaire, mais à vérifier que l'objet Artist retourné est complet (firstName + lastName + stageNames).

### 4. Service notifications

- `services/notifications.js` — auditer `notifyExistingPlaysForArtist` et `notifyCastChanges`. Si le texte des notifications affiche un nom d'artiste, utiliser `displayName` plutôt que firstName + lastName en dur.

### 5. Index Mongo

- `artistSchema.index({lastName: 1, firstName: 1, _id: 1})` à reconsidérer. Possiblement remplacer par un index sur un champ dérivé `sortableName` (= `lastName || stageNames[0]`).

### 6. Frontend

- **Fonction `displayName(artist, options)`** centralisée. C'est la source de vérité pour tous les libellés. Selon le contexte :
  - page artiste → nom complet avec alias entre parenthèses
  - fiche de pièce → `billedAs`
  - chip dans un picker → `billedAs` pour les pièces déjà créditées, sinon nom principal
- **Vues à mettre à jour** : `Play.jsx`, `PlayList.jsx`, `Notification.jsx`, tout endroit qui lit `artist.firstName + ' ' + artist.lastName`.
- **Formulaires** : `PlayForm.jsx` (les comédiens), futur formulaire de création/édition d'artiste (3 champs avec validation).
- **Picker** (composant à construire) : Autocomplete + chips, sur la base de MUI. Voir section dédiée plus bas.

### 7. Migration de données

- Les `Artist` existants ont firstName + lastName, donc valides sous le nouveau schéma sans modification.
- Les `Play.artists[]` existants n'ont pas `billedAs`. Stratégie pragmatique : **rendre `billedAs` optionnel** au niveau du schéma, et faire un fallback dans `displayName` (`billedAs ?? firstName + ' ' + lastName`). On peut migrer en arrière-plan plus tard avec un script.

---

## Ordre d'exécution suggéré

1. **Schémas** (`artist.js`, `play.js`) + validation custom. Tester que les données existantes restent valides.
2. **`findSimilarArtists`** — refonte avec petit fichier de tests sur les données réelles.
3. **Endpoints artist** dans l'ordre : reads (`GET`) d'abord, puis writes (`POST`).
4. **Endpoints play** : populates d'abord, validation `billedAs` ensuite.
5. **Patch user** — minimal, mais à vérifier.
6. **Service notifications** — audit + adoption de `displayName`.
7. **Frontend** : `displayName` helper en premier, puis vues, puis formulaires. Le picker en dernier (dépend de la search corrigée).

---

## Décisions UX en suspens

### Le picker côté frontend

Composant typeahead + chips (style Gmail), basé sur `<Autocomplete multiple>` de MUI.

**Question à trancher** : un artiste à plusieurs noms apparaît dans la dropdown comme :
- **(a)** plusieurs entrées choisissables (« Arnaud Mathey », « Raclor », « Chouchou »), chacune fixant le `billedAs` immédiatement.
- **(b)** une seule entrée + un sous-choix « Crédité comme : [select] » après sélection.

L'option (a) est plus directe. L'option (b) est plus propre si la liste d'artistes devient grande.

**Question à trancher** : que se passe-t-il si l'utilisateur tape un nom qui n'existe pas ?
- **Option A** : silence, doit choisir dans la liste.
- **Option B** : afficher « + Créer un nouvel artiste » en bas de la dropdown, qui ouvre un dialog branchant sur le flux `/check-duplicates` puis `POST /artists`.

Recommandation : commencer par **A**, ajouter **B** dans un second temps.

### Flux de création depuis le formulaire de play

Si on choisit l'option B ci-dessus, le pré-remplissage du dialog de création depuis un texte saisi pose la question : on remplit `firstName` + `lastName` (en splittant le texte) ou `stageName` ? L'utilisateur devra basculer manuellement.

---

## Bugs et tâches connexes à traiter en cours de route

- **Bug multi-tokens dans `/search`** : « Yann m » retourne `[]` aujourd'hui (regex `^yann m` ne matche aucun champ). À fixer en intégrant la stratégie de tokens dans la refonte de search.
- **Bug accents dans `findSimilarArtists`** : la stratégie de pré-filtrage compare la première lettre normalisée à la DB non normalisée. « Élise » et « Elise » ne se matchent pas.
- **Décalage entre `PlayForm` et le schéma `play`** : le form envoie `comediens: [{firstName, lastName, role}]`, le schéma attend `artists: [{artist: ObjectId, personnage: String}]`. Le picker est ce qui résout ce décalage — donc cohérent avec ce plan.

---

## Ce qui n'est PAS dans le scope de cette refonte

- Le flux self-claim (un utilisateur qui revendique un Artist qu'il n'a pas créé) — déjà identifié comme phase 2.
- Le merge admin de deux Artists qui sont en fait la même personne — utile mais à reporter, pas bloquant pour le launch.
- Toute l'UX d'édition d'artiste (ajouter/retirer un stageName a posteriori) — peut venir après le launch.
