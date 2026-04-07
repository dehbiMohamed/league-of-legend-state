import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RiotAccount {
  gameName: string;
  tagLine: string;
  puuid: string;
}

export interface RankedEntry {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

@Injectable({ providedIn: 'root' })
export class RiotApiService {
  private readonly http = inject(HttpClient);

  getAccount(gameName: string, tagLine: string): Observable<RiotAccount> {
    return this.http.get<RiotAccount>(`http://localhost:8787/api/summoner/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
  }

  getRanked(puuid: string): Observable<RankedEntry[]> {
    return this.http.get<RankedEntry[]>(`http://localhost:8787/api/ranked/${encodeURIComponent(puuid)}`);
  }
}
