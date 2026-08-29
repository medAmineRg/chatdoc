# DocChat — Stack Technique

## Stack

| Couche | Choix | Pourquoi |
|--------|-------|----------|
| Framework | Next.js 15 (App Router) | Recommandé par le test. Frontend + API dans un seul dépôt, déploiement Vercel sans configuration, streaming intégré. |
| Langage | TypeScript (`strict: true`) | Obligatoire. |
| LLM | Gemini `gemini-flash-latest` (via Vercel AI SDK) | Quota gratuit généreux, rapide, streaming de tokens facile. Modèle configurable via variable d'environnement (`GEMINI_CHAT_MODEL`). |
| Embeddings | Gemini `gemini-embedding-001` (768 dims via `outputDimensionality`) | Même fournisseur, une seule clé API. Multilingue. |
| Store vectoriel | MongoDB Atlas Vector Search | « Apprécié » dans le brief. Une seule base pour docs + vecteurs, `$vectorSearch` cosinus retourne le score de similarité. |
| Parsing PDF | Côté client (`unpdf` / pdf.js dans le navigateur) | Évite la limite de taille du corps serverless (~4,5 Mo) et le timeout sur un parsing intensif. |
| Validation | zod | Validation des entrées + erreurs structurées. |
| UI | Tailwind + shadcn/ui + `useChat` (AI SDK) | Rapide, propre, gère le chat + l'état de streaming. |
| Déploiement | Vercel | Obligatoire. |

## Pourquoi le parsing PDF côté client

1. Un PDF de 10 Mo dépasse la limite de ~4,5 Mo du corps de requête Vercel — impossible d'envoyer le fichier brut en POST.
2. Analyser 50 pages est gourmand en CPU et consomme le timeout de la fonction.

Le navigateur extrait le texte → envoie uniquement le texte à l'API → la fonction serverless reste légère et rapide (embeddings + écriture en base uniquement).

## Contraintes serverless gérées

- **Connexions MongoDB :** mise en cache du `MongoClient` dans un singleton global pour que les démarrages à froid n'épuisent pas le pool de connexions.
- **Embeddings dans le timeout :** traitement par lots des chunks ; affichage de la progression dans l'UI F1 pendant le calcul.

## Modèle de données

```
Collection : chunks
{
  _id, documentId, filename,
  pageNumber, chunkIndex,
  text,
  embedding: [768 floats]   // index vectoriel Atlas sur ce champ
}
```

Index vectoriel Atlas : `numDimensions: 768`, `similarity: "cosine"`.

## Découpage

Séparateur de caractères récursif, ~800–1000 tokens par chunk, ~15% de chevauchement.

## Pourquoi pas LangChain / LlamaIndex

Le pipeline RAG complet ici est composé de six petits modules purs — `chunk`, `embeddings`,
`retrieval`, `rerank`, `prompt`, `validation` — connectés directement au Vercel AI
SDK et au driver MongoDB. À cette taille, un framework coûterait plus qu'il n'apporterait :

- **Transparence.** L'ancrage dépend entièrement du prompt système exact et des chunks
  récupérés précisément. Écrire cela directement (`lib/prompt.ts`, `lib/retrieval.ts`)
  rend le comportement évident et facile à auditer — pas de templates de prompts
  cachés ni de paramètres par défaut du retriever à déchiffrer.
- **Contrôle du streaming.** Le streaming de tokens + l'annotation des sources sont
  gérés précisément avec `streamText` / `createDataStreamResponse` ; une abstraction
  de chaîne de plus haut niveau gênerait plutôt qu'elle n'aiderait.
- **Moins de dépendances, moins d'instabilité.** LangChain/LlamaIndex tirent de larges
  arbres de dépendances qui évoluent vite ; les SDKs directs maintiennent l'installation
  légère et la surface stable.
- **Testabilité.** Les fonctions pures (découpage, construction du prompt, re-classement)
  sont testées unitairement directement sans scaffolding de framework (voir `tests/`).

Si le pipeline grossissait (nombreux loaders, agents, tool-calling, un zoo de retrievers),
un framework commencerait à s'amortir — LlamaIndex en particulier pour la largeur
d'ingestion. Pour une application RAG mono-fournisseur, mono-store, les SDKs directs
sont le choix le plus simple et le plus clair.

## Multilingue (FR / AR)

Le pipeline est agnostique à la langue de bout en bout :

- **Extraction** — `unpdf` retourne du texte Unicode ; les accents français survivent
  au traitement (vérifié sur `docs/sample/fr.pdf`).
- **Tokenizer** — le re-classeur lexical découpe sur `\p{L}` / `\p{N}` (toute lettre
  ou chiffre Unicode), donc les accents français et l'écriture arabe se tokenisent
  correctement — pas d'hypothèse `[a-z]` (`tests/multilingual.test.ts`).
- **Embeddings** — `gemini-embedding-001` est multilingue, donc la récupération
  sémantique fonctionne dans toutes les langues.
- **Génération** — le prompt système demande au modèle de *répondre dans la même
  langue que la question*.

**Le français** est généré et évalué de bout en bout (`docs/sample/fr.pdf`, voir
`EVAL.md`). **L'arabe** fonctionne via le même chemin ; il n'est pas généré comme
exemple car les PDF arabes corrects nécessitent une mise en forme de texte
droite-à-gauche (HarfBuzz) que les polices standard de pdf-lib ne fournissent pas.
Déposez un vrai PDF arabe basé sur du texte dans `docs/sample/` et il transite sans
modification — la seule condition est que la source intègre du vrai texte Unicode
(pas une image scannée ni des contours de glyphes aplatis).
