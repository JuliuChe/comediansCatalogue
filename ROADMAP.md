# Roadmap — Catalogue de pièces de théâtre

Décisions actées le 2026-05-17 après discussion stratégique.
Ce document est un journal de décisions, pas un cahier des charges figé.

---

## Vision

Catalogue de pièces au service de la **scène culturelle de Suisse romande**.

- Les comédiens créent et gèrent leurs fiches (auth requise)
- Le grand public consulte le catalogue librement
- Quiconque googlant une pièce, un comédien ou un théâtre romand doit pouvoir tomber sur une fiche

**Conséquence technique majeure** : le site est *public-facing*, donc le SEO est obligatoire — pages de lecture indexables, Open Graph pour les previews sociales, première peinture rapide pour visiteurs anonymes.

## Objectif de lancement

🚀 **Octobre 2026** (≈ 5 mois)

Règle absolue : viser une version "lançable" un mois avant la vraie date pour absorber l'imprévu.

---

## Stack cible

| Couche | Aujourd'hui (mai 2026) | Au lancement (oct 2026) | Plus tard |
|---|---|---|---|
| Frontend | React + Vite + JSX + MUI + React Query | **Next.js + TypeScript** + MUI + React Query | idem |
| Backend | Node + Express + Mongoose + JWT | idem (Node) | **Migration vers Python** (post-lancement) |
| DB | MongoDB | MongoDB | MongoDB (ou évolution selon besoin) |
| Services annexes | — | — | **Scraper Python, OG images, recommandations** |

**Principe** : jamais deux technos nouvelles en parallèle. Next.js d'abord (avec TS), Python ensuite, services Python en dernier.

---

## Décisions et arbitrages

### ✅ Migration Next.js avant lancement

**Pourquoi** : SEO obligatoire pour un catalogue public. Une SPA Vite sert mal Google et les bots sociaux.

**Quand** : démarrage juillet/août 2026, après ménage Vite et bases TS acquises.

**Coût estimé** : 2-4 semaines de travail soutenu, courbe d'apprentissage incluse.

### ✅ TypeScript dès la migration

**Pourquoi** : migrer JSX → TSX après coup est plus douloureux que partir en TS directement. La formation FSO Part 9 couvre TS pile au bon moment.

**Quand** : Part 9 de FSO en juillet, puis migration Next en TS direct.

### ✅ GraphQL : non pour ce projet

**Pourquoi** : un seul client, un seul utilisateur (au sens équipe), pas d'API publique. REST + React Query couvre 100 % du besoin. Le coût de schéma et de réécriture serveur n'est pas justifié.

**Action** : FSO Part 8 sera faite en exercices cours uniquement, pas intégrée au projet.

### ✅ Port backend Node → Python : APRÈS lancement

**Pourquoi** : motivation pédagogique (apprendre Python pour de vrai, hors du pattern "je délègue tout à Claude au boulot"). N'est pas une nécessité produit.

**Quand** : phase 4, à partir de novembre 2026, sans deadline.

**Règle d'or pour cette phase** : *c'est l'utilisatrice qui écrit le code Python.* Claude tutore, relit, débloque — mais n'écrit pas. Si la règle saute, l'objectif d'apprentissage est mort.

### ✅ Services Python complémentaires : en dernier

Idées candidates (à valider à la phase 5) :
- Scraper des programmations des théâtres romands (Vidy, Kléber, Forum Meyrin, Comédie de Genève, etc.)
- Génération automatique d'images Open Graph par pièce
- Recommandation "pièces similaires"

**Quand** : à partir de mi-2027, conditionnellement à une vraie valeur produit.

---

## Calendrier détaillé

```
Mai 2026         Ménage Vite + FSO Part 7
                 ├─ Remplir usePlays.js (useQuery + useMutation)
                 ├─ Virer les useState(plays) d'App.jsx
                 ├─ Régler le bug useMatch('/blogs/:id') vs route /plays/:id
                 ├─ Refactor PlayForm (Niveau 1+2 du Todo.md)
                 └─ Démarrer FSO Part 7 (Router, custom hooks, styles)

Juin 2026        FSO Part 7 + Part 8 (exos uniquement)
                 ├─ Finir Part 7, appliquer les custom hooks au catalogue
                 └─ Part 8 GraphQL : exercices cours, pas dans le projet

Juillet 2026     FSO Part 9 — TypeScript
                 ├─ Apprendre les bases : types, interfaces, génériques, Pick/Omit/Partial
                 └─ Commencer à typer les nouveaux fichiers du Vite actuel pour pratiquer

Août 2026        Migration Next.js (en TypeScript direct)
                 ├─ Créer frontend_catalogue_next/ en parallèle
                 ├─ Apprendre : App Router, Server vs Client Components, fetch côté serveur
                 ├─ Porter route par route : /, /plays/:id, /login, /create, /artists, /theaters
                 └─ Backend Express reste inchangé

Septembre 2026   SEO, polish, CI/CD
                 ├─ generateMetadata par page (title, description)
                 ├─ Open Graph images (titre + image de la pièce)
                 ├─ sitemap.xml, robots.txt
                 ├─ Lighthouse audit, perf mobile
                 ├─ FSO Part 11 (CI/CD) appliquée au déploiement
                 └─ Choix hébergeur (Vercel ? Railway ? autre ?)

Mi-octobre 2026  Buffer + tests finaux
Fin octobre 2026 🚀 LANCEMENT

Nov 2026 →       Phase 4 — Port backend Node → Python (sans deadline)
mi-2027          Règle : utilisatrice code, Claude tutore.

Mi-2027 →        Phase 5 — Services Python complémentaires (conditionnel)
```

---

## Stack pédagogique parallèle (FSO Helsinki)

| Part | Sujet | Statut | Quand |
|---|---|---|---|
| 0-5 | Fondamentaux + Express + Tests | ✅ Fait | — |
| 6 | State management (Redux, React Query) | ✅ En cours de finalisation | Mai |
| 7 | React Router + custom hooks + styles | ⏳ À faire | Mai-juin |
| 8 | GraphQL | ⚠️ Exos uniquement | Juin |
| 9 | TypeScript | 🎯 Critique | Juillet |
| 10 | React Native | ➖ Hors scope | — |
| 11 | CI/CD | ✅ Utile | Septembre |
| 12 | Docker | ➖ Plus tard | Phase 4 ou 5 |
| 13 | SQL | ➖ Si changement de DB | Plus tard |

**Note** : FSO ne couvre pas Next.js. La migration sera le premier projet *hors-cours* — un cap important dans la trajectoire dev.

---

## Risques identifiés et mitigations

| Risque | Mitigation |
|---|---|
| Tenter d'apprendre Next.js, TS, Python en même temps | Plan séquentiel strict ci-dessus, une techno à la fois |
| Tout finir en Vite et migrer juste avant le lancement | Démarrage migration en août, pas en septembre — non négociable |
| Retomber dans le pattern "je délègue tout à Claude" pendant la phase Python | Règle explicite : Julie écrit, Claude tutore. À rappeler en phase 4 |
| Vouloir ajouter des features après septembre | Feature freeze début septembre. Tout ce qui arrive après part en backlog post-lancement |
| Lancer sans SEO "juste pour cette fois" | Le SEO est *la raison* de passer à Next.js. Pas de lancement sans `generateMetadata` minimal par page |

---

## Prochaine action concrète

Semaine du 2026-05-25 : ouvrir [`src/hooks/queries/usePlays.js`](src/hooks/queries/usePlays.js) (actuellement vide) et écrire le premier `useQuery` pour `getAll()`, puis brancher le résultat dans App.jsx pour virer le `useState([])` + `useEffect`.
