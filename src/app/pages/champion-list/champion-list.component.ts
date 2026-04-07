import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ChampionSummary, RiotApiService } from '../../services/riot-api.service';

@Component({
  selector: 'app-champion-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './champion-list.component.html',
  styleUrl: './champion-list.component.css',
})
export class ChampionListComponent {
  private readonly riotApi = inject(RiotApiService);
  private readonly router = inject(Router);

  readonly query = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly champions = signal<ChampionSummary[]>([]);
  readonly searchFocused = signal(false);

  readonly suggestions = computed(() => {
    const term = this.query().trim().toLowerCase();

    if (!term) {
      return [];
    }

    return this.champions()
      .filter((champion) => champion.name.toLowerCase().includes(term))
      .slice(0, 6);
  });

  readonly indexedCount = computed(() => this.champions().length);
  readonly showSuggestions = computed(() => this.searchFocused() && this.suggestions().length > 0);

  constructor() {
    void this.loadChampions();
  }

  async loadChampions(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const champions = await firstValueFrom(this.riotApi.getChampions());
      this.champions.set(champions);
    } catch {
      this.champions.set([]);
      this.error.set('Impossible de charger la liste des champions. Verifie la connexion reseau.');
    } finally {
      this.loading.set(false);
    }
  }

  onSearchFocus(): void {
    this.searchFocused.set(true);
  }

  onSearchBlur(): void {
    setTimeout(() => this.searchFocused.set(false), 150);
  }

  openChampionDetail(championId: string): void {
    this.searchFocused.set(false);
    void this.router.navigate(['/champions', championId]);
  }

  openFirstSuggestion(): void {
    const firstSuggestion = this.suggestions()[0];

    if (firstSuggestion) {
      this.openChampionDetail(firstSuggestion.id);
    }
  }

  clearQuery(): void {
    this.query.set('');
    this.searchFocused.set(false);
  }

  championTrackBy(_: number, champion: ChampionSummary): string {
    return champion.id;
  }
}
