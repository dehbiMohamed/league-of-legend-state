import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { RankedEntry, RiotAccount, RiotApiService } from './services/riot-api.service';

interface ChampionItem {
  name: string;
  role: 'Assassin' | 'Mage' | 'Tank' | 'Fighter' | 'Marksman' | 'Support';
  difficulty: 'Facile' | 'Moyen' | 'Difficile';
  lane: 'Top' | 'Jungle' | 'Mid' | 'Bot' | 'Support';
}

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

  championQuery = signal('');
  selectedRole = signal<'Tous' | ChampionItem['role']>('Tous');

  readonly champions = signal<ChampionItem[]>([
    { name: 'Ahri', role: 'Mage', difficulty: 'Moyen', lane: 'Mid' },
    { name: 'Yasuo', role: 'Fighter', difficulty: 'Difficile', lane: 'Mid' },
    { name: 'Lee Sin', role: 'Fighter', difficulty: 'Difficile', lane: 'Jungle' },
    { name: 'Jinx', role: 'Marksman', difficulty: 'Facile', lane: 'Bot' },
    { name: 'Leona', role: 'Tank', difficulty: 'Facile', lane: 'Support' },
    { name: 'Zed', role: 'Assassin', difficulty: 'Moyen', lane: 'Mid' },
    { name: 'Lux', role: 'Mage', difficulty: 'Facile', lane: 'Mid' },
    { name: 'Thresh', role: 'Support', difficulty: 'Difficile', lane: 'Support' },
    { name: 'Ornn', role: 'Tank', difficulty: 'Moyen', lane: 'Top' },
  ]);

  readonly filteredChampions = computed(() => {
    const query = this.championQuery().trim().toLowerCase();
    const role = this.selectedRole();

    return this.champions().filter((champion) => {
      const matchRole = role === 'Tous' || champion.role === role;
      const matchQuery = !query || champion.name.toLowerCase().includes(query);
      return matchRole && matchQuery;
    });
  });

  constructor(private readonly riotApi: RiotApiService) {}

  updateQuery(value: string): void {
    this.championQuery.set(value);
  }

  pickRole(role: 'Tous' | ChampionItem['role']): void {
    this.selectedRole.set(role);
  }

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
    } catch {
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
