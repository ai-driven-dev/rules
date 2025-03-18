# 📐 AI-Driven Dev {Rules}

![Status](https://img.shields.io/badge/status-active-brightgreen)
![Version](https://img.shields.io/badge/version-0.0.2-blue)
![Contributors](https://img.shields.io/badge/contributors-welcome-orange)
[![Discord](https://img.shields.io/discord/1173363373115723796?color=7289da&label=discord&logo=discord&logoColor=white)](https://discord.gg/invite/ai-driven-dev)

Dans la philosophie de l'AI-Driven Dev, nous utilisons des règles pour améliorer grandement les réponses de l'IA dans nos IDEs.

>
> **Besoin d'aide pour configurer Cursor ?** [Rejoignez le Discord de l'AI-Driven Dev](https://discord.gg/invite/ai-driven-dev)
>

- [Contribution](#contribution)
  - [Ajouter une nouvelle règles](#ajouter-une-nouvelle-règles)
    - [Structure actuelle](#structure-actuelle)
    - [Règles existantes](#règles-existantes)
- [Installer ces règles sur votre projet](#installer-ces-règles-sur-votre-projet)
  - [Récupérer les règles de l'AI-Driven Dev](#récupérer-les-règles-de-lai-driven-dev)
  - [Créer une nouvelle règle](#créer-une-nouvelle-règle)
    - [Documentations officielles (Cursor, Windsurf, GitHub Copilot)](#documentations-officielles-cursor-windsurf-github-copilot)
- [Exemples de règles](#exemples-de-règles)
  - [.cursor/rules](#cursorrules)
  - [.cursorrules](#cursorrules-1)
- [Outils de génération de règles personnalisées](#outils-de-génération-de-règles-personnalisées)
- [Autres tutoriels pour créer ses règles](#autres-tutoriels-pour-créer-ses-règles)
- [TODO](#todo)

## Contribution

L'idée de ce dépôt est de tous se partager les meilleures règles Cursor, de les tester et de les améliorer ensemble.

**N'hésitez surtout pas à améliorer les règles existantes il n'y a pas de mauvaise contribution on est tous en train d'apprendre et on a tous nos spécificités je serais incapable de rédiger des règles Java !**

Let'sgo !

### Ajouter une nouvelle règles

<https://www.youtube.com/embed/G0yHSrSMZWQ?si=SzRaytgr504AJxia>

#### Structure actuelle

Les règles se créer avec les fichiers `000-cursor-rules.mdc` et `400-md-docs.mdc`.

Voici la structure reprise de [bmadcode](https://github.com/bmadcode/cursor-auto-rules-agile-workflow/tree/main?tab=readme-ov-file#file-organization).

- [ ] 💡 À discuter : on va finir par avoir beaucoup de règles, comment séparer toutes les sous-factions de "React > React-Testing Library" ou "NestJS > Repositories"

- `0XX`: Core rules and standards
- `1XX`: Tool and MCP rules
- `3XX`: Testing standards
- `8XX`: Workflow rules
- `9XX`: Templates
- `1XXX`: Language-specific rules
- `2XXX`: Framework/library rules

#### Règles existantes

Voici le tableau des règles existantes.

> Vous pouvez modifier et améliorer ces règles à tout moment !

| Règle | Description | Fichiers | Application |
| --- | --- | --- | --- |
| `000-cursor-rules.mdc` | Use ALWAYS when asked to CREATE A RULE or UPDATE A RULE or taught a lesson from the user | `.cursor/rules/*.mdc` | Match |
| `001-feature-based-architecture.mdc` | APPLY Clean Architecture principles WHEN organizing code TO ensure separation of concerns and testability | `apps/frontend/**` | Match |
| `002-clean-architecture.mdc` | APPLY Clean Architecture principles WHEN organizing code TO ensure separation of concerns and testability | `apps/backend/**` | Match |
| `003-domain-driven-design.mdc` | APPLY Domain-Driven Design principles WHEN modeling business domains TO ensure software aligns with business needs | `apps/backend/**` | Match |
| `004-naming-conventions.mdc` | Naming Conventions Standards | `*` | Permanent |
| `005-clean-code.mdc` | Clean Code Standards | `*` | Permanent |
| `006-shared-types.mdc` | APPLY shared types standards WHEN creating DTOs and interfaces TO ensure consistent data structures across frontend and backend | `packages/shared-types/*.ts` | Match |
| `007-commit-conventions.mdc` | APPLY commit message conventions WHEN creating commits TO ensure clear and consistent version history | `-` | Manuel |
| `008-project-documentation.mdc` | APPLY documentation standards WHEN writing project documentation TO ensure clarity, completeness, and maintainability | `**/*.md, **/docs/**/*, **/documentations/**/*` | Match |
| `009-versions.mdc` | APPLY version management standards WHEN installing or updating dependencies TO ensure consistency and stability | `**/package.json` | Permanent |
| `301-testing-standards.mdc` | APPLY testing standards WHEN writing tests TO ensure comprehensive and maintainable test suites | `*.spec.*,*.test.*` | Match |
| `400-md-docs.mdc` | ALWAYS use when writing or updating Markdown files | `.md,.mdx` | Match |
| `900-project-specific.mdc` | APPLY project-specific rules TO ensure consistent documentation across projects | `**/*` | Permanent |
| `1001-typescript.mdc` | APPLY TypeScript best practices WHEN writing code TO ensure type safety, readability, and maintainability | `*.ts` | Match |
| `1002-devops.mdc` | APPLY DevOps best practices WHEN managing infrastructure and deployment TO ensure reliability, scalability, and security | `**/docker-compose.yml,**/Dockerfile,**/.github/workflows/*.yml` | Match |
| `2001-mobx.mdc` | APPLY MobX state management patterns WHEN managing application state TO ensure predictable and efficient state updates | `*.store.ts,*.store.tsx` | Match |
| `2002-remix.mdc` | APPLY Remix framework standards WHEN developing with Remix TO ensure consistent and maintainable full-stack applications | `remix.config.js,*.component.tsx` | Match |
| `2003-nestjs.mdc` | APPLY NestJS framework standards WHEN developing with NestJS TO ensure scalable and maintainable server-side applications | `apps/backend/**/*.ts` | Match |
| `2004-prisma.mdc` | APPLY Prisma ORM standards WHEN working with database models TO ensure efficient and type-safe database operations | `schema.prisma` | Match |
| `2005-react.mdc` | APPLY React best practices WHEN developing components and hooks TO ensure performant and maintainable UI code | `apps/frontend/**/*.tsx,apps/frontend/**/*.hook.ts` | Match |

## Installer ces règles sur votre projet

Voici des exemples de Cursor Rules à récupérer pour votre projet.

**Ces règles sont des instructions pour l'IA de l'éditeur, qui peut être GitHub Copilot, Cursor ou Windsurf.**

> Note spécifique à Cursor : `.cursorrules`est déprécié, séparez vos règles dans `.cursor/rules/*.mdc`.

### Récupérer les règles de l'AI-Driven Dev

Ces règles sont des templates pour vous aider à configurer vos propres règles.

*Nous travaillons actuellement à les rendre templatisables pour tous les projets.*

1. Dans ce dépôt, récupérez le dossier `.cursor/rules`.
2. Ajustez-les pour VOTRE projet.
3. Supprimez les règles / langages qui ne vous intéressent pas.
4. Ajoutez vos propres règles.
5. Partagez vos règles avec la communauté.
6. Codez 2x plus vite.

### Créer une nouvelle règle

Pour créer vos propres règles dans Cursor :

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

#### Documentations officielles (Cursor, Windsurf, GitHub Copilot)

Les règles sont fortement poussé par Anysphere (Cursor) mais vous pouvez les utiliser sur d'autres IDEs comme Windsurf ou GitHub Copilot.

Voici les documentations officielles pour les règles / instructions :

- [GitHub Copilot](https://docs.github.com/fr/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot?tool=vscode)
- [Cursor](https://docs.cursor.com/context/rules-for-ai)
  - [Cursor Forum : Mémoire dans Cursor](https://forum.cursor.com/t/rules-for-ultra-context-memories-lessons-scratchpad-with-plan-and-act-modes/48792/21?page=2)
- [Windsurf (+ mémoire)](https://docs.codeium.com/windsurf/memories)
  - [Windsurf directory](https://codeium.com/windsurf/directory) - Un ensemble de règles de la communauté par langage de programmation.

## Exemples de règles

Si vous cherchez de l'inspiration pour vos règles.

### .cursor/rules

- [alexsoyes](https://github.com/ai-driven-dev/le-journal/tree/main/.cursor/rules) - TypeScript : Remix + NestJS (🔐 privé pour les membres de l'AI-Driven Dev)
- [giak](https://github.com/giak/cv-generator/tree/main/.cursor/rules) - Vue 3
- [Melvynx](https://github.com/Melvynx/cursor.rules) - TypeScript : React + NextJS
- [mckaywrigley](https://github.com/mckaywrigley/mckays-app-template/tree/main/.cursor/rules) - TypeScript : React + NextJS

### .cursorrules

- [awesome cursor rules](https://github.com/PatrickJS/awesome-cursorrules) - Une liste de règles pour Cursor.
- [cursor.directory](https://cursor.directory/rules) - Un ensemble de règles de la communauté par langage de programmation
- [devin.cursorules](https://github.com/grapeot/devin.cursorrules/blob/master/.cursorrules) - Transformer son IDE en agent IA (comme Devin qui coûte 400$/mois)
- [mckaywrigley](https://github.com/mckaywrigley/mckays-app-template/blob/main/.cursorrules) - Projet de démo full AI stack (Next, Tailwind, Vercel, Supabase...)

## Outils de génération de règles personnalisées

- [AI Prompts (Instruct AI)](https://www.instructa.ai/en/ai-prompts) - Génération de règles par langage avec instructions.
- [Cursor Focus (fork)](https://github.com/RenjiYuusei/CursorFocus) - Màj votre projet toutes les 60 secondes avec des règles IA en fonction du code que vous tapez.
- [Cursor Auto Rules (Agile workflow)](https://github.com/bmadcode/cursor-auto-rules-agile-workflow/) - Outil de génération de règle Cursor.
- [UltraContextAI](https://github.com/T1nker-1220/UltraContextAI) - Crée un système de mémoire avec un agent pour développer des features via un Architecte IA (respecte le flow AIDD, mais dans L'IDE)

## Autres tutoriels pour créer ses règles

- [Créer une règle Cursor](https://notes.switchdimension.com/cursor-ai-rules) - Page Notion de Rob Shocks pour vous montrer comment créer une règle Cursor.
- [Comment générer des règles pour son projet](https://www.youtube.com/watch?v=jEhvwYkI-og) - Vidéo de 15 minutes pour générer des règles pour votre projet.

## TODO

Notes pour la communauté AIDD :

- [ ] Merger le "[Guide du clean code IA](https://www.notion.so/alexsoyes/Guide-du-Clean-Code-avec-IA-17799aa702668072b1f6fccebb8a0ba0?pvs=4)" de l'AI-Driven Dev
- [ ] Configurer la partie `devops` pour les règles
- [ ] Supprimer des règles, il y en a trop, il faut les simplifier
- [ ] Rajouter des exemples pour toutes les règles
- [ ] Revoir les règles avec Baptiste
- [ ] Présentation des nouvelles règles dans le Discord
- [ ] Déploiement via l'extension AI-Driven Dev
