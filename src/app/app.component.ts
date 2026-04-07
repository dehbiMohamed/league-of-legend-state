import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { RankedEntry, RiotAccount, RiotApiService } from './services/riot-api.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  gameName = 'Faker';
  tagLine = 'KR1';

  loading = signal(false);
  error = signal<string | null>(null);
  account = signal<RiotAccount | null>(null);
  ranked = signal<RankedEntry[]>([]);

  constructor(private readonly riotApi: RiotApiService) {}

  async loadProfile(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.account.set(null);
    this.ranked.set([]);

    try {
      const account = await firstValueFrom(this.riotApi.getAccount(this.gameName.trim(), this.tagLine.trim()));
      this.account.set(account);

      const ranked = await firstValueFrom(this.riotApi.getRanked(account.puuid));
      this.ranked.set(ranked);
    } catch (error) {
      this.error.set('Impossible de charger les données Riot. Vérifie la clé API et le proxy local.');
    } finally {
      this.loading.set(false);
    }
  }

  winRate(entry: RankedEntry): number {
    const total = entry.wins + entry.losses;
    return total > 0 ? Math.round((entry.wins / total) * 100) : 0;
  }
}
