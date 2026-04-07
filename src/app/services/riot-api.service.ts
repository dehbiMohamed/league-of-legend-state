import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay, switchMap } from 'rxjs';

interface DataDragonChampionImage {
  full: string;
}

interface DataDragonChampionData {
  id: string;
  key: string;
  name: string;
  title: string;
  blurb: string;
  tags: string[];
  partype: string;
  info: {
    attack: number;
    defense: number;
    magic: number;
    difficulty: number;
  };
  image: DataDragonChampionImage;
}

interface DataDragonChampionStats {
  hp: number;
  mp: number;
  movespeed: number;
  armor: number;
  spellblock: number;
  attackdamage: number;
  attackrange: number;
}

interface DataDragonChampionPassive {
  name: string;
  description: string;
  image: DataDragonChampionImage;
}

interface DataDragonChampionSpell {
  id: string;
  name: string;
  description: string;
  cooldownBurn: string;
  costBurn: string;
  rangeBurn: string;
  image: DataDragonChampionImage;
}

interface DataDragonChampionDetailData extends DataDragonChampionData {
  lore: string;
  allytips: string[];
  enemytips: string[];
  stats: DataDragonChampionStats;
  passive: DataDragonChampionPassive;
  spells: DataDragonChampionSpell[];
}

interface DataDragonChampionResponse<TChampion> {
  version: string;
  data: Record<string, TChampion>;
}

interface ProxyChampionBuildItem {
  id: number;
  name: string;
  quantity: number;
}

interface ProxyChampionBuildRow {
  items: ProxyChampionBuildItem[];
  popularity: number;
  winRate: number;
}

interface ProxyChampionBuildTier {
  key: string;
  label: string;
  sourceUrl: string;
  startingItems: ProxyChampionBuildRow[];
  coreItems: ProxyChampionBuildRow[];
  topItems: ProxyChampionBuildRow[];
}

interface ProxyChampionBuildResponse {
  championId: string;
  championSlug: string;
  queue: string;
  source: string;
  updatedAt: string;
  unavailableTiers: string[];
  tiers: ProxyChampionBuildTier[];
}

export interface ChampionSummary {
  id: string;
  key: string;
  name: string;
  title: string;
  blurb: string;
  tags: string[];
  partype: string;
  attack: number;
  defense: number;
  magic: number;
  difficulty: number;
  imageUrl: string;
}

export interface ChampionSpellDetail {
  id: string;
  name: string;
  description: string;
  cooldown: string;
  cost: string;
  range: string;
  imageUrl: string;
}

export interface ChampionDetail extends ChampionSummary {
  lore: string;
  splashUrl: string;
  allyTips: string[];
  enemyTips: string[];
  passive: {
    name: string;
    description: string;
    imageUrl: string;
  };
  spells: ChampionSpellDetail[];
  stats: {
    health: number;
    mana: number;
    moveSpeed: number;
    armor: number;
    magicResist: number;
    attackDamage: number;
    attackRange: number;
  };
}

export interface ChampionBuildItem {
  id: number;
  name: string;
  quantity: number;
  imageUrl: string;
}

export interface ChampionBuildRow {
  items: ChampionBuildItem[];
  popularity: number;
  winRate: number;
}

export interface ChampionBuildTier {
  key: string;
  label: string;
  sourceUrl: string;
  startingItems: ChampionBuildRow[];
  coreItems: ChampionBuildRow[];
  topItems: ChampionBuildRow[];
}

export interface ChampionPopularBuilds {
  championId: string;
  championSlug: string;
  queue: string;
  source: string;
  updatedAt: string;
  unavailableTiers: string[];
  tiers: ChampionBuildTier[];
}

@Injectable({ providedIn: 'root' })
export class RiotApiService {
  private readonly http = inject(HttpClient);
  private readonly versionsUrl = 'https://ddragon.leagueoflegends.com/api/versions.json';
  private readonly cdnBaseUrl = 'https://ddragon.leagueoflegends.com/cdn';
  private readonly locale = 'fr_FR';

  private readonly version$ = this.http.get<string[]>(this.versionsUrl).pipe(
    map((versions) => versions[0]),
    shareReplay(1)
  );

  private readonly champions$ = this.version$.pipe(
    switchMap((version) =>
      this.http.get<DataDragonChampionResponse<DataDragonChampionData>>(
        `${this.cdnBaseUrl}/${version}/data/${this.locale}/champion.json`
      )
    ),
    map((response) =>
      Object.values(response.data)
        .map((champion) => this.mapChampionSummary(champion, response.version))
        .sort((left, right) => left.name.localeCompare(right.name, 'fr'))
    ),
    shareReplay(1)
  );

  getChampions(): Observable<ChampionSummary[]> {
    return this.champions$;
  }

  getChampionDetail(championId: string): Observable<ChampionDetail> {
    return this.version$.pipe(
      switchMap((version) =>
        this.http.get<DataDragonChampionResponse<DataDragonChampionDetailData>>(
          `${this.cdnBaseUrl}/${version}/data/${this.locale}/champion/${encodeURIComponent(championId)}.json`
        )
      ),
      map((response) => {
        const champion = Object.values(response.data)[0];
        return this.mapChampionDetail(champion, response.version);
      })
    );
  }

  getChampionPopularBuilds(championId: string): Observable<ChampionPopularBuilds> {
    return this.version$.pipe(
      switchMap((version) =>
        this.http
          .get<ProxyChampionBuildResponse>(`/api/champion-builds/${encodeURIComponent(championId)}`)
          .pipe(map((response) => this.mapChampionPopularBuilds(response, version)))
      )
    );
  }

  private mapChampionSummary(champion: DataDragonChampionData, version: string): ChampionSummary {
    return {
      id: champion.id,
      key: champion.key,
      name: champion.name,
      title: champion.title,
      blurb: this.cleanText(champion.blurb),
      tags: champion.tags,
      partype: champion.partype,
      attack: champion.info.attack,
      defense: champion.info.defense,
      magic: champion.info.magic,
      difficulty: champion.info.difficulty,
      imageUrl: `${this.cdnBaseUrl}/${version}/img/champion/${champion.image.full}`,
    };
  }

  private mapChampionDetail(champion: DataDragonChampionDetailData, version: string): ChampionDetail {
    const summary = this.mapChampionSummary(champion, version);

    return {
      ...summary,
      lore: this.cleanText(champion.lore),
      splashUrl: `${this.cdnBaseUrl}/img/champion/splash/${champion.id}_0.jpg`,
      allyTips: champion.allytips.map((tip) => this.cleanText(tip)),
      enemyTips: champion.enemytips.map((tip) => this.cleanText(tip)),
      passive: {
        name: champion.passive.name,
        description: this.cleanText(champion.passive.description),
        imageUrl: `${this.cdnBaseUrl}/${version}/img/passive/${champion.passive.image.full}`,
      },
      spells: champion.spells.map((spell) => ({
        id: spell.id,
        name: spell.name,
        description: this.cleanText(spell.description),
        cooldown: spell.cooldownBurn || 'N/A',
        cost: spell.costBurn || 'Aucun',
        range: spell.rangeBurn || 'N/A',
        imageUrl: `${this.cdnBaseUrl}/${version}/img/spell/${spell.image.full}`,
      })),
      stats: {
        health: champion.stats.hp,
        mana: champion.stats.mp,
        moveSpeed: champion.stats.movespeed,
        armor: champion.stats.armor,
        magicResist: champion.stats.spellblock,
        attackDamage: champion.stats.attackdamage,
        attackRange: champion.stats.attackrange,
      },
    };
  }

  private mapChampionPopularBuilds(response: ProxyChampionBuildResponse, version: string): ChampionPopularBuilds {
    return {
      ...response,
      tiers: response.tiers.map((tier) => ({
        ...tier,
        startingItems: tier.startingItems.map((row) => this.mapChampionBuildRow(row, version)),
        coreItems: tier.coreItems.map((row) => this.mapChampionBuildRow(row, version)),
        topItems: tier.topItems.map((row) => this.mapChampionBuildRow(row, version)),
      })),
    };
  }

  private mapChampionBuildRow(row: ProxyChampionBuildRow, version: string): ChampionBuildRow {
    return {
      popularity: row.popularity,
      winRate: row.winRate,
      items: row.items.map((item) => ({
        ...item,
        imageUrl: `${this.cdnBaseUrl}/${version}/img/item/${item.id}.png`,
      })),
    };
  }

  private cleanText(value: string): string {
    return value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li>/gi, '- ')
      .replace(/<[^>]+>/g, '')
      .replace(/{{[^}]+}}/g, '...')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
