# 📐 AI-Driven Dev {Rules}

![Status](https://img.shields.io/badge/status-active-brightgreen)
![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Contributors](https://img.shields.io/badge/contributors-welcome-orange)
[![Discord](https://img.shields.io/discord/1173363373115723796?color=7289da&label=discord&logo=discord&logoColor=white)](https://discord.gg/invite/ai-driven-dev)

**Dans la philosophie de l'AI-Driven Dev, nous utilisons des règles pour améliorer l'expérience de développement.**

Ces règles sont des instructions pour l'IA de l'éditeur, qui peut être GitHub Copilot, Cursor ou Windsurf.

- [Installation](#installation)
  - [Comment utiliser ces règles ?](#comment-utiliser-ces-règles-)
  - [Récupérer les règles de l'AI-Driven Dev](#récupérer-les-règles-de-lai-driven-dev)
- [Official documentation](#official-documentation)
- [Exemples de règles](#exemples-de-règles)
  - [.cursor/rules](#cursorrules)
  - [.cursorrules](#cursorrules-1)
- [Outils de génération de règles](#outils-de-génération-de-règles)
- [Tutoriels pour créer ses règles](#tutoriels-pour-créer-ses-règles)
- [TODO](#todo)

## Installation

Voici des exemples de configuration rules pour Cursor.

> `.cursorrules`est déprécié, splittez vos règles dans `.cursor/rules/*.mdc`.

### Comment utiliser ces règles ?

Ce sont des templates desquels vous inspirer pour vos propres règles en fonction de vos besoins ET de votre stack.

1. Ouvrez `Cursor`, aller dans les `Settings`.
2. Dans `Project Rules`.
3. Cliquer sur `+ Add new rule`.
   1. `Description`: Quand votre règle est appliquée.
   2. `Globs`: Sur quels fichiers appliquer la règle.
   3. `Content`: Le contenu de la règle (`markdown` ou `XML`).
4. Le contenu se retrouvera directement dans des `.cursor/rules/*.mdc`
   1. <img src="https://alexsoyes.com/wp-content/uploads/2025/02/cursor-project-rules.png" width="500" alt="cursor-rules-settings">
5. Exemple d'utilisation dans le chat
   1. <img src="https://alexsoyes.com/wp-content/uploads/2025/02/cursor-chat-rules.png" width="500" alt="cursor-rules-chat">
6. Vous avez mes règles persos en guise de template.
7. Enjoy 🙂

### Récupérer les règles de l'AI-Driven Dev

Dans ce dépôt, dans le dossier `.cursor/rules`, vous trouverez nos règles pour Cursor.

1. Récupérez l'ensemble des règles.
2. Ajustez-les pour VOTRE projet.
3. Supprimez les règles / langages qui ne vous intéressent pas.
4. Ajoutez vos propres règles.
5. Partagez vos règles avec la communauté.
6. Codez 2x plus vite.

## Official documentation

Les règles sont fortement poussé par Anysphere (Cursor) mais vous pouvez les utiliser avec vos propres IDE IAs.

- [GitHub Copilot](https://docs.github.com/fr/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot?tool=vscode)
- [Cursor](https://docs.cursor.com/context/rules-for-ai)
  - [Cursor Forum : Mémoire dans Cursor](https://forum.cursor.com/t/rules-for-ultra-context-memories-lessons-scratchpad-with-plan-and-act-modes/48792/21?page=2)
- [Windsurf (+ mémoire)](https://docs.codeium.com/windsurf/memories)
  - [Windsurf directory](https://codeium.com/windsurf/directory) - Un ensemble de règles de la communauté par langage de programmation.

## Exemples de règles

Si vous cherchez de l'inspiration pour vos règles.

### .cursor/rules

La nouvelle manière d'écrire des règles pour Cursor.

- [alexsoyes](https://github.com/ai-driven-dev/le-journal/tree/main/.cursor/rules) - TypeScript : Remix + NestJS (🔐 privé pour les membres de l'AI-Driven Dev)
- [giak](https://github.com/giak/cv-generator/tree/main/.cursor/rules) - Vue 3
- [Melvynx](https://github.com/Melvynx/cursor.rules) - TypeScript : React + NextJS
- [mckaywrigley](https://github.com/mckaywrigley/mckays-app-template/tree/main/.cursor/rules) - TypeScript : React + NextJS

### .cursorrules

- [awesome cursor rules](https://github.com/PatrickJS/awesome-cursorrules) - Une liste de règles pour Cursor.
- [cursor.directory](https://cursor.directory/rules) - Un ensemble de règles de la communauté par langage de programmation
- [devin.cursorules](https://github.com/grapeot/devin.cursorrules/blob/master/.cursorrules) - Transformer son IDE en agent IA (comme Devin qui coûte 400$/mois)
- [mckaywrigley](https://github.com/mckaywrigley/mckays-app-template/blob/main/.cursorrules) - Projet de démo full AI stack (Next, Tailwind, Vercel, Supabase...)

## Outils de génération de règles

Des outils pour vous aider à générer des règles pour vos règles personnalisées à votre projet.

- [Cursor Focus (fork)](https://github.com/RenjiYuusei/CursorFocus) - Màj votre projet toutes les 60 secondes avec des règles IA en fonction du code que vous tapez.
- [Cursor Auto Rules (Agile workflow)](https://github.com/bmadcode/cursor-auto-rules-agile-workflow/) - Outil de génération de règle Cursor.
- [UltraContextAI](https://github.com/T1nker-1220/UltraContextAI) - Crée un système de mémoire avec un agent pour développer des features via un Architecte IA (respecte le flow AIDD, mais dans L'IDE)

## Tutoriels pour créer ses règles

Des tutoriels pour vous aider à créer vos règles.

- [Créer une règle Cursor](https://notes.switchdimension.com/cursor-ai-rules) - Page Notion de Rob Shocks pour vous montrer comment créer une règle Cursor.
- [Comment générer des règles pour son projet](https://www.youtube.com/watch?v=jEhvwYkI-og) - Vidéo de 15 minutes pour générer des règles pour votre projet.

## TODO

- [ ] Merger le "[Guide du clean code IA](https://www.notion.so/alexsoyes/Guide-du-Clean-Code-avec-IA-17799aa702668072b1f6fccebb8a0ba0?pvs=4)" de l'AI-Driven Dev
- [ ] Rajouter la partie `devops` pour les règles
- [ ] Supprimer des règles, il y en a trop, il faut les simplifier
- [ ] Rajouter des exemples pour toutes les règles
- [ ] Revoir les règles avec Baptiste
- [ ] Présentation des nouvelles règles dans le Discord
- [ ] Déploiement via l'extension AI-Driven Dev
