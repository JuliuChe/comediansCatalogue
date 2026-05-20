# Frontend — Roadmap

Document de planification des évolutions frontend à venir.

---

## Inbox de notifications

**Origine** : étape 6 du plan inbox (cf. `INBOX_PLAN.md` côté backend). L'API `/api/notifications` est en place (`GET` liste + `PATCH /:id`), il reste à câbler le frontend.

### Fichiers à créer

- [ ] `src/components/Inbox.jsx` — page liste des notifications
- [ ] `src/api/requests/notifications.js` — wrappers axios (`getNotifications`, `patchNotificationStatus`)
- [ ] `src/hooks/queries/useNotifications.js` — hook TanStack Query
- [ ] Composant "header avec badge" : n'existe pas encore visiblement → à créer ou à intégrer dans le Layout actuel

### Routing

- [ ] Ajouter une route `/inbox` dans `src/App.jsx`
- [ ] Route **protégée** : accessible seulement si `userContext` connecté (sinon redirect login)

### Comportement attendu

- Liste de cartes avec : titre de la pièce, rôle (`cast` / `director`), date, boutons **Accept** / **Reject**
- Sur action Accept/Reject → `PATCH /api/notifications/:id` puis `queryClient.invalidateQueries(['notifications'])`
- Badge compteur dans le header : nombre de notifs `pending`
  - Option (a) : query séparée `GET /api/notifications?status=pending` puis `.length`
  - Option (b) : dérivé du cache de la query principale si elle inclut déjà les pending
  - À trancher au moment de l'implé selon ce qui est le moins coûteux côté DX

### Points ouverts

- **Affichage du rôle** : si on a accès au champ `personnage` via la play populée, afficher *"cast (Éliante)"* plutôt que juste *"cast"*. Sinon rester sur le rôle nu.
- **Tri** : par `createdAt` desc côté backend, à laisser tel quel côté frontend.
- **État `withdrawn`** : pas encore généré côté backend (cf. décisions différées du plan inbox). Quand ça arrivera, prévoir un affichage spécifique ("retirée" en gris) ou filtrer côté liste.

### Décisions héritées du backend

- Une notif est créée **par rôle** : un artist à la fois `cast` ET `director` sur la même play reçoit 2 cartes distinctes dans l'inbox.
- Règle de curation publique : *"au moins un rôle accepté = play visible sur le profil"* (cf. étape 5 du plan inbox).
- Le rejet d'un rôle **ne supprime pas** l'artist de la fiche play publique — il filtre seulement ce qui apparaît sur le profil perso de l'artiste.

---

## Création d'un nouvel Artist avec détection de doublons

**Origine** : refonte du modèle Artist côté backend (cf. `backend_catalogue/refonte-modele-artiste.md`). Le backend expose maintenant :

- `GET /artists/check-duplicates?name=...` — retourne les Artists similaires avec un score (`[{ id, name, score }]`)
- `POST /artists` — création directe, sans pré-vérification de doublon (la garantie vient du frontend)
- `GET /artists/:id/plays` — les pièces d'un Artist (utile pour distinguer un homonyme légitime d'un vrai doublon)

Le frontend doit orchestrer le flux : check avant POST, et donner à l'utilisateur les moyens de décider entre « c'est lui » et « non, nouveau profil ».

### Fichiers à créer ou compléter

- [ ] `src/api/requests/artists.js` : ajouter `checkDuplicates(name)` et `getPlays(artistId)`
- [ ] `src/hooks/queries/useArtists.js` : ajouter `useArtistPlays(artistId, options)` avec `enabled` configurable pour le lazy fetch
- [ ] `src/components/CreateArtistForm.jsx` : composant de formulaire orchestrant le flux check + create
- [ ] `src/components/DuplicatesModal.jsx` : modale qui affiche les candidats similaires
- [ ] `src/components/CandidateCard.jsx` : carte expansible pour un candidat (avec lazy fetch de ses pièces)

### Flux conceptuel — machine à états

Le composant `CreateArtistForm` traverse cinq états :

| État | Description | Transitions sortantes |
|---|---|---|
| `idle` | Formulaire affiché, user saisit le nom | → `checking` (au clic « Créer ») |
| `checking` | Appel `/check-duplicates` en cours | → `creating` (si 0 similaires) ou `reviewing` (si ≥ 1) |
| `reviewing` | Modale ouverte avec liste des candidats | → `done` (si « C'est cet artiste »), `creating` (si « Créer quand même »), ou `idle` (si « Annuler ») |
| `creating` | Appel `POST /artists` en cours | → `done` (succès) ou `idle` (erreur) |
| `done` | Création confirmée OU sélection d'un existant validée | sortie : redirect vers la page de l'Artist, ou callback parent (cas picker) |

Représentation graphique :

```
[idle]
   ↓ submit du formulaire
[checking]
   ↓ réponse de /check-duplicates
   ├─ similar.length === 0 → [creating] → [done]
   └─ similar.length > 0   → [reviewing]
                                 ↓ action user
                                 ├─ "C'est cet artiste"       → [done]
                                 ├─ "Non, créer quand même"   → [creating] → [done]
                                 └─ "Annuler"                  → [idle]
```

### State local à manager

- `phase: 'idle' | 'checking' | 'reviewing' | 'creating' | 'done'`
- `nameInput: string` (champ contrôlé)
- `similarFound: Array<{id, name, score}>` (résultat de check-duplicates, vide par défaut)

Deux `useMutation` React Query (un pour le check, un pour le POST), ou un hook custom `useCreateArtistWithCheck` qui les compose.

### La modale de doublons — Option A (v1)

Pour permettre de distinguer un vrai doublon d'un homonyme légitime (deux Arnaud Mathey peuvent exister), la modale doit donner accès à la **liste des pièces** de chaque candidat — c'est le signal n°1 pour reconnaître quelqu'un dans un catalogue culturel.

**Structure** : chaque candidat est rendu comme une `<CandidateCard>` qui contient :

- **Header** : nom + indicateur de score + toggle « Voir ses pièces »
- **Zone expansible** (déployée au clic) : appelle `useArtistPlays(candidate.id, { enabled: isExpanded })` — le lazy fetch garantit qu'on ne charge les pièces que si l'utilisateur le demande explicitement
- **Bouton « C'est cet artiste »** placé *à l'intérieur* de la zone expand (pas dans le header). Cela force l'utilisateur à au moins consulter la liste des pièces avant de confirmer — évite les sélections impulsives sur un homonyme

**Footer de la modale** :

- « Non, créer quand même » → passe à `creating`
- « Annuler » → revient à `idle`

### Options B et C — différées post-v1

Si la modale devient trop chargée (plus de 5-6 candidats fréquemment) ou si l'UX inline atteint ses limites, deux alternatives à évaluer plus tard :

- **Option B — « Voir le profil » dans un nouvel onglet** : compléter ou remplacer le bouton « Voir ses pièces » par un lien qui ouvre `/artists/:id` dans un nouvel onglet. Utilise la page profil existante (pas de duplication d'UI). Inconvénient : casse le flux, le user peut perdre son contexte.
- **Option C — Panneau latéral inspector** : au lieu d'expand inline, le click sur un candidat ouvre un panneau à droite avec ses détails (style IDE). Très propre pour des comparaisons côte à côte. Nécessite un layout adapté.

À évaluer une fois l'Option A en production avec du feedback réel.

### Décisions UX en suspens

- **Désactivation du bouton « Créer »** pendant les phases `checking` et `creating` pour éviter les double-clics. Texte du bouton qui change selon l'état (« Créer » → « Vérification… » → « Création… »).
- **Cas réseau** : si `/check-duplicates` timeout/échoue, deux comportements possibles — bloquer et afficher une erreur (« réessayer »), ou fallback permissif en « créer quand même » avec un toast. La deuxième est plus permissive mais peut créer des vrais doublons en cas de panne. À trancher à l'implé.
- **Affichage du score** : pourcentage explicite (« 87 % de proximité ») ou indicateur visuel (étoiles, barre colorée) ? Choix esthétique.
- **Contexte d'utilisation** : ce composant va-t-il vivre dans une page dédiée (`/artists/new`) ou être appelé depuis le picker du formulaire de Play (inline) ? **V1 : page dédiée.** V2 : intégration dans le picker (cas où l'utilisateur tape un nom inexistant et veut le créer sans quitter le formulaire de Play).

### Points qui dépendent du backend

- Le shape actuel de `/check-duplicates` est `[{ id, name, score }]`. Si plus tard on enrichit le retour (par exemple `dateOfBirth`, `alsoKnownAs`, `playsCount`), la modale pourra afficher plus de signaux sans fetch séparé.
- `GET /artists/:id/plays` retourne les pièces avec leurs métadonnées (titre, dates, theater). Vérifier au moment du build de la modale que les champs retournés (via `.populate`) sont suffisants pour identifier rapidement les pièces dans la card.
