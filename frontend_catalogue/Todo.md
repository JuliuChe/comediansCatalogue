# Todo — Refactoring du PlayForm

## Constat

Le composant `PlayForm` commence à être lourd :

- 8 `useState` distincts
- Plusieurs handlers qui se ressemblent (`handleComedienChange`, `handleAddComedien`, `handleRemoveComedien`)
- Une section comédiens qui mériterait son propre composant
- Le JSX devient long à scroller

Objectif : nettoyer sans sur-ingénierer.

---

## Les 4 niveaux de refactoring

### Niveau 1 — Extraire les sous-composants

Impact visuel immédiat, complexité très faible.

- [ ] Sortir `<ComediensFields />` dans son propre fichier (`components/ComediensFields.jsx`)
- [ ] Éventuellement sortir `<PlayDatesFields />` si ça allège encore
- [ ] Passer les props `value` / `onChange` au sous-composant (pattern contrôlé)

### Niveau 2 — Regrouper l'état en un seul objet

Moins de `useState`, moins de bruit.

- [ ] Remplacer les 8 `useState` par un seul `useState(formData)` qui contient tous les champs
- [ ] Créer un handler générique `handleFieldChange(field, value)`
- [ ] Initialiser proprement `formData` avec les valeurs par défaut (dates à `null`, comédiens à `[emptyComedien()]`, etc.)
- [ ] Vérifier qu'on reset bien l'objet entier après `createPlay`

### Niveau 3 — Custom hook `useArrayField`

Logique réutilisable pour toute liste dynamique (comédiens, dates de représentation, etc.).

- [ ] Créer `hooks/useArrayField.js` qui expose `{ items, add, remove, update }`
- [ ] Brancher `<ComediensFields />` dessus
- [ ] Prévoir de réutiliser le hook pour d'autres listes plus tard

### Niveau 4 — Passer à React Hook Form

La solution "pro", rentable dès que les formulaires se multiplient.

- [ ] Installer `react-hook-form`
- [ ] Convertir `PlayForm` avec `useForm` et `Controller` pour les champs MUI
- [ ] Ajouter la validation (titre obligatoire, dates cohérentes, etc.)
- [ ] Gérer la liste dynamique des comédiens avec `useFieldArray`
- [ ] Optionnel : ajouter `zod` ou `yup` pour un schéma de validation

---

## Recommandation

Faire **Niveau 1 + Niveau 2** tout de suite. Bon équilibre entre "ranger sa chambre" et éviter le sur-engineering.

Passer au **Niveau 4 (React Hook Form)** plus tard si :

- Plusieurs formulaires apparaissent dans l'app
- La validation devient un sujet
- Les formulaires grossissent encore

Le **Niveau 3** n'est pertinent que si plusieurs listes dynamiques apparaissent dans d'autres formulaires.

---

## Bugs / dettes techniques à corriger au passage

- [ ] Renommer `textFiledStyle` → `textFieldStyle` (typo)
- [ ] Vérifier que le backend Mongoose renvoie `id` ou `_id` pour `theater` et adapter l'Autocomplete
- [ ] Ajouter un état `loading` pendant le chargement des théâtres (UX)
- [ ] Gérer les erreurs de `createPlay` (try/catch + feedback utilisateur)
- [ ] Valider que `endDate >= startDate` avant l'envoi (le `minDate` du DatePicker ne suffit pas si l'utilisateur tape à la main)
