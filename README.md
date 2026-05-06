# 🎮 LoLdle Discord Bot

Bot Discord inspiré de [LoLdle](https://loldle.net), permettant de deviner un champion League of Legends à partir d'une portion de son splash art. Développé en TypeScript avec [discordx](https://discordx.js.org/).

---

## ✨ Fonctionnalités

### Mode Splash Art
- Un champion est tiré au sort chaque jour à minuit — **le même pour tous les joueurs du serveur**
- Le joueur lance une partie via `/play` dans n'importe quel salon
- Le bot lui envoie un **DM** avec une portion croppée aléatoire du splash art
- Le joueur devine via `/guess` avec **autocomplete** sur les noms de champions
- À chaque mauvaise réponse, la zone de crop **s'agrandit** (zoom out progressif depuis le même centre)
- L'historique des tentatives s'affiche avec l'**icône du champion** en 🔴 ou 🟢
- **3 tentatives maximum**
- En cas d'échec, le splash art complet est révélé

### Classement quotidien
- À la fin de chaque journée, le bot poste un **récapitulatif des scores** dans un salon configuré
- Le classement affiche chaque joueur et son nombre d'essais

---

## 📸 Flow du jeu

```
[Joueur]  /play
                → DM reçu avec crop 150x150px

[Joueur]  /guess Ahri       → ❌
                → DM édité  : 🔴 Ahri | crop 280x280px

[Joueur]  /guess Lee Sin    → ❌
                → DM édité  : 🔴 Ahri | 🔴 Lee Sin | crop 420x420px

[Joueur]  /guess Jinx       → ✅
                → DM édité  : 🔴 Ahri | 🔴 Lee Sin | 🟢 Jinx
                → 🎉 Trouvé en 3 essais !

[À minuit] → classement posté dans le salon configuré
```

---

## ⚙️ Tailles de crop progressives

| Tentative | Taille du crop |
|-----------|---------------|
| 1         | 150 x 150 px  |
| 2         | 280 x 280 px  |
| 3         | 420 x 420 px  |
| Échec     | Splash complet révélé |

> La zone de départ est aléatoire mais le **centre reste fixe** — l'image "zoom out" progressivement.

---

## 🛠️ Stack technique

| Outil | Usage |
|-------|-------|
| [discordx](https://discordx.js.org/) | Framework Discord avec décorateurs TypeScript |
| [discord.js](https://discord.js.org/) | Base du bot |
| [sharp](https://sharp.pixelplumbing.com/) | Crop des splash arts |
| [Data Dragon](https://developer.riotgames.com/docs/lol) | Assets champions (images, sorts) — gratuit, sans clé |
| dotenv | Variables d'environnement |
| TypeScript | Langage principal |

---

## 📁 Structure du projet

```
src/
├── main.ts                    # Entry point — boot du bot
├── commands/
│   ├── SetupCommand.ts        # /setup — configure le salon des résultats
│   ├── PlayCommand.ts         # /play  — lance une partie en DM
│   └── GuessCommand.ts        # /guess — soumet une réponse (avec autocomplete)
├── game/
│   ├── SessionManager.ts      # Gestion des parties en cours par utilisateur
│   └── SplashGame.ts          # Logique du crop progressif avec sharp
├── data/
│   ├── ddragon.ts             # Fetch & cache Data Dragon (version, champions, assets)
│   └── quotes.json            # Citations manuelles par champion (modes futurs)
└── utils/
    └── embed.ts               # Builders d'embeds Discord réutilisables
```

---

## 🚀 Installation

### Prérequis
- Node.js >= 20
- TypeScript >= 5
- Un bot Discord créé sur le [Developer Portal](https://discord.com/developers/applications)

### Setup

```bash
# Cloner le projet
git clone https://github.com/ton-user/discord-loldle.git
cd discord-loldle

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
```

Remplis le `.env` :

```env
BOT_TOKEN=ton_token_ici
CLIENT_ID=ton_client_id_ici
GUILD_ID=ton_guild_id_ici   # optionnel, pour le serveur de test
```

```bash
# Lancer en développement
npm run dev

# Build pour la production
npm run build
npm run start
```

---

## ⚙️ Configuration du bot sur ton serveur

Une fois le bot en ligne, l'admin configure le salon des résultats :

```
/setup #loldle-résultats
```

Le bot mémorise ce salon et y postera le classement chaque soir.

---

## 🗺️ Roadmap

- [x] Mode Splash Art
- [ ] Mode Citation — deviner le champion depuis une de ses phrases
- [ ] Mode Compétence — deviner le champion depuis l'icône d'un de ses sorts
- [ ] Statistiques personnelles (streak, win rate)
- [ ] Mode multijoueur (duel)

---

## 📜 Données & Assets

Les images et données des champions sont récupérées via **Data Dragon**, l'API statique officielle de Riot Games — gratuite et sans clé API.

```
https://ddragon.leagueoflegends.com/cdn/{version}/data/fr_FR/champion.json
```

> Ce projet est un projet de fan non affilié à Riot Games.
> League of Legends et tous les assets associés sont la propriété de Riot Games.
