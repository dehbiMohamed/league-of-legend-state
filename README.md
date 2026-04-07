# League of Legend State (Angular)

Premier jet en Angular pour consulter des stats League of Legends via l'API officielle Riot.

## Lancer le projet

1. Installer les dépendances:
   ```bash
   npm install
   ```
2. Définir la clé API Riot:
   ```bash
   export RIOT_API_KEY="RGAPI-..."
   ```
3. Démarrer le proxy Riot:
   ```bash
   npm run proxy
   ```
4. Dans un autre terminal, lancer Angular:
   ```bash
   npm start
   ```

## Endpoints proxy

- `GET /api/summoner/:gameName/:tagLine`
- `GET /api/ranked/:puuid`

Le front Angular interroge le proxy local pour éviter d'exposer la clé API côté client.
