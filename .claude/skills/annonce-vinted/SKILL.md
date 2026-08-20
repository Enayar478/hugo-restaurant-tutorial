---
name: annonce-vinted
description: Rédige un brouillon d'annonce Vinted (content/ventes/) pour une pièce à vendre. À utiliser quand l'utilisateur veut vendre un vêtement ou préparer/mettre à jour une annonce.
---

# Préparer une annonce Vinted

Argument attendu : un slug de pièce de la garde-robe, ou une description de la pièce à vendre.

1. Si la pièce existe dans `content/garde-robe/`, lis son fichier pour récupérer marque, couleur, taille, prix d'achat. Sinon demande : marque, taille, état, défauts éventuels, prix d'achat.
2. Estime un **prix de vente réaliste** (WebSearch des prix Vinted/Vestiaire pour le même modèle si possible ; sinon règle générale : 30–50 % du neuf selon l'état, marques cotées type Red Wing décotent moins).
3. Crée `content/ventes/<slug>.md` avec le schéma de `CLAUDE.md`. Le **corps du fichier est le texte final de l'annonce**, prêt à copier-coller :
   - titre accrocheur : marque + modèle + taille ;
   - description honnête : mesures à plat (demander si inconnues), état précis avec défauts, contexte (« bilan colorimétrie, je vide mon dressing ») ;
   - mention envoi rapide et soigné, ouverture aux lots ;
   - 4–6 hashtags pertinents en dernière ligne.
4. Statuts à maintenir : annonce `brouillon` à la création ; quand l'utilisateur dit l'avoir publiée → `statut: publie` et la pièce liée passe à `statut: en-vente` ; vendue → `vendu` des deux côtés (et noter le prix obtenu).
5. Vérifie le build, puis affiche le texte de l'annonce pour validation.
