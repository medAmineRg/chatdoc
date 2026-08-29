# DocChat

Posez des questions sur votre PDF. Téléversez un document, et DocChat répond en
langage naturel en s'appuyant **uniquement** sur le contenu de ce document — un
pipeline RAG (Retrieval-Augmented Generation) compact, prêt pour la production.

Développé dans le cadre du test technique Smartly.ai. Stack : **Next.js 15 (App Router) +
TypeScript (strict) + MongoDB Atlas Vector Search + Google Gemini**, déployé sur
Vercel.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Navigateur                                                       │
│                                                                   │
│  1. Sélectionner PDF ──►  unpdf extrait le texte (côté client)    │
│                               │  pages: [{ pageNumber, text }]   │
│                               ▼                                   │
│                         POST /api/upload ────────────────────┐   │
│  4. Chat (useChat) ──► POST /api/chat ──► flux SSE ◄─────────┐│  │
└──────────────────────────────────────────────────────────────┼┼──┘
                                                               ││
┌───────────────── Vercel serverless (Node) ───────────────────┼┼──┐
│                                                               │▼  │
│  /api/upload:  découpe → embed (Gemini) → insertion  ─────────┼► Atlas  │
│  /api/chat:    embed requête → $vectorSearch ◄─────────────────┘  (chunks│
│                → prompt ancré → Gemini streamText              + vecteurs│
│                → flux de tokens + annotation des sources        768d)   │
└──────────────────────────────────────────────────────────────────────────┘
```

**Pourquoi parser le PDF côté navigateur ?** Deux contraintes Vercel serverless :

1. **Taille du corps** — un PDF de 10 Mo dépasse la limite de ~4,5 Mo du corps de
   requête, donc le fichier brut ne peut pas être envoyé en POST. On n'envoie que
   le texte extrait.
2. **Timeout** — analyser 50 pages est gourmand en CPU. Déléguer cette tâche au
   client maintient la fonction serverless concentrée sur le chemin rapide
   (embeddings + écriture en base).

---

## Choix techniques et compromis

| Domaine | Choix | Pourquoi / compromis |
|---------|-------|----------------------|
| Framework | Next.js 15 App Router | Frontend + API serverless dans un seul dépôt, streaming natif, déploiement Vercel sans configuration. |
| Langage | TypeScript, `strict` + `noUncheckedIndexedAccess` | Attrape la classe de bugs (accès tableau indéfini) fréquente dans le code de glue RAG. |
| Parsing PDF | `unpdf`, **côté client** | Build pdf.js compatible serverless, sans configuration de worker. Compromis : pas de contrôle serveur du parsing, mais évite les limites de taille/timeout. |
| Embeddings | Gemini `gemini-embedding-001`, réduit à 768 dimensions | Quota gratuit généreux ; un seul fournisseur pour les embeddings et la génération. Conscience du type de tâche (RETRIEVAL_DOCUMENT vs RETRIEVAL_QUERY) pour une meilleure récupération. |
| Store vectoriel | MongoDB Atlas Vector Search | Un seul store pour les documents **et** les vecteurs — pas de base vectorielle séparée à synchroniser. `$vectorSearch` retourne le score cosinus directement, affiché comme sources. |
| LLM | Gemini `gemini-flash-latest` via Vercel AI SDK | Rapide, économique, suffisamment performant pour du Q&A ancré ; l'AI SDK assure le streaming de tokens avec peu de code. Le modèle est surchargeable via variable d'environnement. |
| Validation | Zod | Validation à l'exécution à la frontière API → erreurs structurées. |

**Gestion des connexions serverless :** MongoDB utilise des connexions TCP persistantes,
ce qui se heurte au modèle serverless (chaque démarrage à froid peut épuiser le pool).
On met en cache un unique `MongoClient` sur l'objet global (`lib/mongodb.ts`) pour
le réutiliser entre les invocations.

---

## Stratégie RAG

**Découpage** (`lib/chunk.ts`) — séparateur de caractères récursif, **~3500 chars
(~800–1000 tokens) avec ~500 chars (~15%) de chevauchement**. Il coupe sur le
séparateur sémantique le plus fort disponible (paragraphe → ligne → phrase → mot)
avant une coupure dure. Les documents sont découpés **page par page** pour que
chaque chunk conserve son numéro de page pour les citations. Le chevauchement
préserve le contexte à cheval sur une frontière.

**Récupération** (`lib/retrieval.ts`) — la question est embedée avec le même modèle,
puis Atlas `$vectorSearch` (cosinus) récupère un ensemble de candidats plus large
filtré selon les `documentId`s sélectionnés (un **ou plusieurs** — Q&A
multi-documents). Les candidats sont **re-classés de façon hybride** (`lib/rerank.ts`) :
le classement dense-vectoriel est fusionné avec un classement lexical par mot-clé
via la Reciprocal Rank Fusion, et les **5** premiers sont conservés — chacun portant
toujours son `vectorSearchScore` pour l'affichage.

**Génération** (`lib/prompt.ts`) — les chunks récupérés sont injectés dans un prompt
système qui demande au modèle de répondre **uniquement** à partir du contexte et
d'indiquer explicitement quand la réponse n'est pas dans le document. La réponse
est streamée token par token ; les chunks sources (page + score + aperçu) sont
affichés en parallèle.

---

## API

### `POST /api/upload`
Requête :
```json
{ "filename": "rapport.pdf", "pages": [{ "pageNumber": 1, "text": "…" }] }
```
Réponse `200` :
```json
{ "documentId": "uuid", "filename": "rapport.pdf", "pageCount": 3, "chunkCount": 7 }
```
Erreurs : `400` corps invalide, `413` trop de pages / trop volumineux, `429` limite
de débit atteinte (avec `Retry-After`), `500` échec du pipeline.

### `POST /api/chat`
Requête (`documentIds` peut lister un ou plusieurs documents téléversés) :
```json
{ "documentIds": ["uuid"], "messages": [{ "role": "user", "content": "…" }] }
```
Réponse : un **flux de données** AI SDK (SSE). La réponse de l'assistant est streamée
en texte ; les sources récupérées sont attachées comme annotation de message :
```json
{ "type": "sources", "sources": [{ "filename": "rapport.pdf", "pageNumber": 2, "chunkIndex": 4, "text": "…", "score": 0.83 }] }
```
Erreurs : `400` corps invalide (avec `details` par champ), `429` limite de débit
atteinte (avec `Retry-After`), `500` échec de la génération.

---

## Installation locale

Prérequis : Node 20+, un cluster MongoDB Atlas (le niveau M0 gratuit convient), une
clé API Gemini.

```bash
npm install
cp .env.example .env.local   # remplir les valeurs ci-dessous
npm run dev                  # http://localhost:3000
```

Variables d'environnement :

| Nom | Description |
|-----|-------------|
| `MONGODB_URI` | Chaîne de connexion Atlas |
| `MONGODB_DB` | Nom de la base (optionnel, par défaut `docchat`) |
| `GEMINI_API_KEY` | Clé API Google Gemini |

### Index Atlas Vector Search (obligatoire)

Créez un index Vector Search nommé **`vector_index`** sur la collection `chunks`
(Atlas UI → Search → Create Search Index → JSON editor). Définition dans
[`docs/atlas-vector-index.json`](atlas-vector-index.json) :

```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 768, "similarity": "cosine" },
    { "type": "filter", "path": "documentId" }
  ]
}
```

Les 768 dimensions doivent correspondre à la sortie des embeddings (`gemini-embedding-001`
est réduit à 768 via `outputDimensionality`).

Vous pouvez aussi créer l'index de façon programmatique :

```bash
node --env-file=.env.local scripts/create-index.mjs
```

---

## Déploiement (Vercel)

1. Pousser sur GitHub et importer le dépôt dans Vercel.
2. Définir `MONGODB_URI`, `GEMINI_API_KEY` (et optionnellement `MONGODB_DB`) dans
   Project → Settings → Environment Variables.
3. Autoriser la sortie Vercel dans Atlas Network Access (`0.0.0.0/0` pour le test,
   ou les plages d'IP Vercel).
4. Déployer. Les routes API déclarent `maxDuration = 60` pour les chemins
   d'upload/génération.

---

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarrer le serveur de développement |
| `npm run build` | Build de production |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | Lint Next.js |
| `npm test` | Tests unitaires (vitest) |

---

## Fonctionnalités bonus

Au-delà des exigences principales F1–F6 :

- **Récupération hybride / re-classement** — les résultats vectoriels sont fusionnés
  avec un classement lexical par mot-clé via la Reciprocal Rank Fusion (`lib/rerank.ts`),
  améliorant le rappel pour les termes exacts (noms, codes, montants) que la
  recherche vectorielle pure peut manquer.
- **Q&A multi-documents** — téléversez plusieurs PDF et interrogez n'importe quel
  sous-ensemble sélectionné ; les sources citent le fichier d'origine de chaque
  passage.
- **Limite de débit + logs structurés** — limites par fenêtre fixe par client sur
  les deux endpoints (`429` + `Retry-After`) et logs JSON une ligne par événement
  avec un id de requête et la latence (`lib/rate-limit.ts`, `lib/logger.ts`).
  > **Limitation :** le limiteur est en mémoire, donc sur un déploiement serverless
  > multi-instances chaque instance compte indépendamment. C'est une protection
  > au mieux pour ce test ; un déploiement en production s'appuierait sur Redis
  > (ex. Upstash).
- **Tests** — tests unitaires sur les fonctions pures pour le découpage, la
  construction du prompt, le re-classement et le limiteur de débit (`tests/`,
  `npm test`).
- **Multilingue (FR/AR)** — extraction Unicode-safe, tokenizer et embeddings
  multilingues ; le modèle répond dans la langue de la question. Le français est
  vérifié de bout en bout ; l'arabe fonctionne via le même chemin. Détails dans
  [`TECH_STACK.md`](../TECH_STACK.md#multilingual-fr--ar). Générez les exemples
  avec `node scripts/make-sample-pdfs.mjs`.
- **Sans framework RAG lourd** — AI SDK + driver Mongo directs plutôt que
  LangChain/LlamaIndex ; justification dans
  [`TECH_STACK.md`](../TECH_STACK.md#why-not-langchain--llamaindex).

## Couverture des exigences

F1 upload + validation + progression · F2 découpage + embeddings + recherche cosinus ·
F3 chat ancré avec historique · F4 sources avec scores de similarité · F5 API REST
documentée avec erreurs structurées · F6 streaming de tokens. Voir `BACKLOG.md`.
