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
