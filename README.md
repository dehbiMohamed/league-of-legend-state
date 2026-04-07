# League of Legend State (Angular)

Version actuelle du front: catalogue de champions League of Legends.

## Lancer le projet

1. Installer les dependances:
   ```bash
   npm install
   ```
2. Lancer le front Angular:
   ```bash
   npm start
   ```

L'ecran principal charge les champions directement depuis Data Dragon, donc aucune cle Riot API n'est necessaire pour cette partie.

## Donnees champions

Le front consomme:

- `GET https://ddragon.leagueoflegends.com/api/versions.json`
- `GET https://ddragon.leagueoflegends.com/cdn/<version>/data/fr_FR/champion.json`

## Proxy Riot

Le proxy Node est toujours present si tu veux ensuite revenir sur des donnees joueur.

1. Definir la cle API Riot:
   ```bash
   export RIOT_API_KEY="RGAPI-..."
   ```
2. Demarrer le proxy:
   ```bash
   npm run proxy
   ```

Endpoints disponibles:

- `GET /api/summoner/:gameName/:tagLine`
- `GET /api/ranked/:puuid`
