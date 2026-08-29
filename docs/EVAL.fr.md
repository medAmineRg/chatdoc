# DocChat — Résultats d'Évaluation

Généré par `npm run eval` le 2026-08-28 · modèle de chat `gemini-flash-lite-latest`.

Chaque PDF exemple est extrait (unpdf), téléversé, puis interrogé. Les questions auxquelles on peut répondre réussissent quand le fait attendu apparaît dans la réponse ; la question hors-document réussit quand le modèle refuse correctement de répondre.

**Global : 10/10**

## EN — `en.pdf` (1 page)

| Question | Attendu | Source principale | Réponse (extrait) | Résultat |
|---|---|---|---|---|
| How long is the standard warranty period? | 24 months | en.pdf p.1 (83%) | The standard warranty period is 24 months from the date of purchase (page 1). | ✅ |
| What is Acme Robotics' flagship product? | Atlas-7 | en.pdf p.1 (87%) | Acme Robotics' flagship product is the Atlas-7 autonomous lawn mower (page 1). | ✅ |
| In what year was Acme Robotics founded? | 2011 | en.pdf p.1 (86%) | Acme Robotics was founded in 2011 (page 1). | ✅ |
| What are the customer support hours? | 9am | en.pdf p.1 (82%) | Customer support is available Monday to Friday, from 9am to 6pm (page 1). | ✅ |
| What is the retail price of the Atlas-7? | not in the document | en.pdf p.1 (83%) | The information is not in the document. | ✅ |

**Précision : 5/5**

## FR — `fr.pdf` (1 page)

| Question | Attendu | Source principale | Réponse (extrait) | Résultat |
|---|---|---|---|---|
| Quelle est la durée de la garantie standard ? | 24 mois | fr.pdf p.1 (85%) | La période de garantie standard est de 24 mois à compter de l'achat (page 1). | ✅ |
| Quel est le produit phare d'Acme Robotique ? | Atlas-7 | fr.pdf p.1 (88%) | Le produit phare d'Acme Robotique est la tondeuse autonome Atlas-7 (page 1). | ✅ |
| En quelle année Acme Robotique a-t-elle été fondée ? | 2011 | fr.pdf p.1 (87%) | Acme Robotique a été fondée en 2011 (page 1). | ✅ |
| Jusqu'à combien de minutes d'autonomie offre la batterie ? | 90 | fr.pdf p.1 (83%) | La batterie offre jusqu'à 90 minutes d'autonomie (page 1). | ✅ |
| Quel est le prix de vente de l'Atlas-7 ? | pas dans le document | fr.pdf p.1 (83%) | Le prix de vente de l'Atlas-7 n'est pas mentionné dans le document. | ✅ |

**Précision : 5/5**
