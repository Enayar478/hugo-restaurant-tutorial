---
name: creer-tenue
description: Crée une tenue (content/tenues/) à partir de pièces de la garde-robe, ou depuis un export Markdown du Studio. À utiliser quand l'utilisateur veut enregistrer une association de vêtements.
---

# Créer une tenue

Argument attendu : une liste de pièces (noms ou slugs), un export du Studio, ou un brief (« une tenue bureau pour l'hiver »).

1. Liste les pièces disponibles : `Glob content/garde-robe/*.md`, en privilégiant `statut: possede`.
2. Résous chaque pièce demandée vers un slug existant — **jamais de slug inventé**. Si une pièce manque, propose la plus proche ou suggère `/ajouter-piece`.
3. **Contrôle styliste** avant d'écrire (profil dans `CLAUDE.md`) :
   - registre cohérent (Ivy ensemble, workwear ensemble, transitions douces) ;
   - maximum 2 couleurs fortes, le reste en neutres de la palette ;
   - une tenue complète = au moins un haut, un bas, des chaussures.
   Signale tout point discutable, propose mieux si possible.
4. Crée `content/tenues/<slug>.md` avec le schéma de `CLAUDE.md` (`pieces`, `occasion`, `saison`) et une ligne de commentaire de style dans le corps.
5. Vérifie le build et résume la tenue en une phrase de styliste.
