const http = require('node:http');

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const PORT = process.env.PORT || 8787;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
  });
  res.end(JSON.stringify(payload));
}

function parsePath(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  return parts;
}

async function callRiot(url) {
  const response = await fetch(url, {
    headers: {
      'X-Riot-Token': RIOT_API_KEY || '',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Riot API error ${response.status}: ${body}`);
  }

  return response.json();
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (!RIOT_API_KEY) {
    sendJson(res, 500, { error: 'RIOT_API_KEY manquante dans les variables d\'environnement.' });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = parsePath(url.pathname);

  try {
    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'summoner' && parts.length === 4) {
      const gameName = decodeURIComponent(parts[2]);
      const tagLine = decodeURIComponent(parts[3]);
      const endpoint = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
      const data = await callRiot(endpoint);
      sendJson(res, 200, data);
      return;
    }

    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'ranked' && parts.length === 3) {
      const puuid = decodeURIComponent(parts[2]);
      const summonerEndpoint = `https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`;
      const summoner = await callRiot(summonerEndpoint);
      const rankedEndpoint = `https://euw1.api.riotgames.com/lol/league/v4/entries/by-summoner/${encodeURIComponent(summoner.id)}`;
      const ranked = await callRiot(rankedEndpoint);
      sendJson(res, 200, ranked);
      return;
    }

    sendJson(res, 404, { error: 'Route inconnue.' });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Proxy Riot API actif sur http://localhost:${PORT}`);
});
