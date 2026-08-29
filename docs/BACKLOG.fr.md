# DocChat — Backlog (Exigences Fonctionnelles)

| ID | FONC | DESC |
|----|------|------|
| F1 | Upload PDF | Téléverser un PDF avec validation (type, taille max ~10 Mo / ~50 pages). Afficher la progression visuelle du traitement : parsing → découpage → embeddings. |
| F2 | Pipeline RAG | Extraire le texte, le découper (taille justifiée + chevauchement), calculer les embeddings via une API (OpenAI/Gemini/Cohere/Voyage), stocker et rechercher par similarité cosinus. |
| F3 | Chat Q&A | Interface de chat avec historique de session. Chaque réponse s'appuie uniquement sur le document (pas de connaissances générales du LLM). Si l'information n'est pas dans le document, le dire explicitement. |
| F4 | Afficher les sources | Pour chaque réponse, afficher les chunks sources utilisés (texte tronqué acceptable) avec leur score de similarité. |
| F5 | API REST | Endpoints propres et documentés (minimum : POST /api/upload, POST /api/chat). Codes HTTP corrects, gestion structurée des erreurs. |
| F6 | Streaming | Réponse du LLM affichée en streaming (token par token) sur le frontend. |
