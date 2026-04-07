const http = require('node:http');

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const PORT = process.env.PORT || 8787;
const LEAGUE_OF_GRAPHS_BASE_URL = 'https://www.leagueofgraphs.com/champions/items';
const LEAGUE_OF_GRAPHS_QUEUE = 'ranked';
const BUILD_CACHE_TTL_MS = 15 * 60 * 1000;
const BUILD_CACHE = new Map();
const ELO_TIERS = [
  { key: 'iron', label: 'Iron+' },
  { key: 'bronze', label: 'Bronze+' },
  { key: 'silver', label: 'Silver+' },
  { key: 'gold', label: 'Gold+' },
  { key: 'platinum', label: 'Platinum+' },
  { key: 'emerald', label: 'Emerald+' },
  { key: 'diamond', label: 'Diamond+' },
  { key: 'master', label: 'Master+' },
];

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

function ensureRiotApiKey() {
  if (!RIOT_API_KEY) {
    throw new Error("RIOT_API_KEY manquante dans les variables d'environnement.");
  }
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

function normalizeChampionSlug(championId) {
  return championId.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function formatPercentage(rawValue) {
  return Math.round(Number(rawValue || 0) * 1000) / 10;
}

function extractSectionTable(pageHtml, sectionTitle) {
  const titleIndex = pageHtml.indexOf(sectionTitle);

  if (titleIndex === -1) {
    return '';
  }

  const tableStart = pageHtml.indexOf('<table', titleIndex);
  const tableEnd = pageHtml.indexOf('</table>', tableStart);

  if (tableStart === -1 || tableEnd === -1) {
    return '';
  }

  return pageHtml.slice(tableStart, tableEnd + '</table>'.length);
}

function parseBuildItems(cellHtml) {
  const items = Array.from(cellHtml.matchAll(/<img\b[^>]*alt="([^"]+)"[^>]*tooltip-var="item-(\d+)"[^>]*>/g)).map(
    ([, name, id]) => ({
      id: Number(id),
      name,
      quantity: 1,
    })
  );
  const trailingQuantity = cellHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().match(/x(\d+)$/i);

  if (items.length > 0 && trailingQuantity) {
    items[items.length - 1].quantity = Number(trailingQuantity[1]);
  }

  return items;
}

function parseProgressValue(cellHtml) {
  const match = cellHtml.match(/data-value="([^"]+)"/);
  return formatPercentage(match ? match[1] : 0);
}

function parseBuildTable(sectionHtml, limit) {
  if (!sectionHtml) {
    return [];
  }

  const rows = [];

  for (const rowMatch of sectionHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)) {
    const rowHtml = rowMatch[1];
    const cells = Array.from(rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g));

    if (cells.length < 3) {
      continue;
    }

    const items = parseBuildItems(cells[0][1]);

    if (items.length === 0) {
      continue;
    }

    rows.push({
      items,
      popularity: parseProgressValue(cells[1][1]),
      winRate: parseProgressValue(cells[2][1]),
    });

    if (rows.length >= limit) {
      break;
    }
  }

  return rows;
}

function parseChampionBuildPage(pageHtml) {
  return {
    startingItems: parseBuildTable(extractSectionTable(pageHtml, 'Starting Items'), 3),
    coreItems: parseBuildTable(extractSectionTable(pageHtml, 'Core Items'), 4),
    topItems: parseBuildTable(extractSectionTable(pageHtml, 'Top Items'), 6),
  };
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`LeagueOfGraphs error ${response.status} for ${url}`);
  }

  return response.text();
}

async function fetchChampionTierBuild(championSlug, tier) {
  const pageUrl =
    tier.key === 'platinum'
      ? `${LEAGUE_OF_GRAPHS_BASE_URL}/${championSlug}?queue=${LEAGUE_OF_GRAPHS_QUEUE}`
      : `${LEAGUE_OF_GRAPHS_BASE_URL}/${championSlug}/${tier.key}?queue=${LEAGUE_OF_GRAPHS_QUEUE}`;
  const pageHtml = await fetchText(pageUrl);
  const buildSections = parseChampionBuildPage(pageHtml);

  return {
    key: tier.key,
    label: tier.label,
    sourceUrl: pageUrl,
    ...buildSections,
  };
}

async function getChampionBuilds(championId) {
  const championSlug = normalizeChampionSlug(championId);
  const cachedBuilds = BUILD_CACHE.get(championSlug);

  if (cachedBuilds && cachedBuilds.expiresAt > Date.now()) {
    return cachedBuilds.payload;
  }

  const tierResults = await Promise.allSettled(
    ELO_TIERS.map((tier) => fetchChampionTierBuild(championSlug, tier))
  );
  const tiers = [];
  const unavailableTiers = [];

  tierResults.forEach((result, index) => {
    const tier = ELO_TIERS[index];

    if (result.status === 'fulfilled') {
      tiers.push(result.value);
      return;
    }

    unavailableTiers.push(tier.key);
  });

  if (tiers.length === 0) {
    throw new Error('Impossible de recuperer les stuffs populaires pour ce champion.');
  }

  const payload = {
    championId,
    championSlug,
    queue: LEAGUE_OF_GRAPHS_QUEUE,
    source: 'LeagueOfGraphs',
    updatedAt: new Date().toISOString(),
    unavailableTiers,
    tiers,
  };

  BUILD_CACHE.set(championSlug, {
    expiresAt: Date.now() + BUILD_CACHE_TTL_MS,
    payload,
  });

  return payload;
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

  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = parsePath(url.pathname);

  try {
    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'champion-builds' && parts.length === 3) {
      const championId = decodeURIComponent(parts[2]);
      const data = await getChampionBuilds(championId);
      sendJson(res, 200, data);
      return;
    }

    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'summoner' && parts.length === 4) {
      ensureRiotApiKey();
      const gameName = decodeURIComponent(parts[2]);
      const tagLine = decodeURIComponent(parts[3]);
      const endpoint = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
      const data = await callRiot(endpoint);
      sendJson(res, 200, data);
      return;
    }

    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'ranked' && parts.length === 3) {
      ensureRiotApiKey();
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
