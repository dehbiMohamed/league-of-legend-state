import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, map } from 'rxjs';
import {
  ChampionBuildItem,
  ChampionBuildRow,
  ChampionBuildTier,
  ChampionDetail,
  ChampionPopularBuilds,
  RiotApiService,
} from '../../services/riot-api.service';

@Component({
  selector: 'app-champion-detail',
  imports: [CommonModule, RouterLink],
  templateUrl: './champion-detail.component.html',
  styleUrl: './champion-detail.component.css',
})
export class ChampionDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly riotApi = inject(RiotApiService);
  private readonly championId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id') ?? '')), {
    initialValue: '',
  });
  private readonly percentFormatter = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly champion = signal<ChampionDetail | null>(null);
  readonly builds = signal<ChampionPopularBuilds | null>(null);
  readonly activeTier = signal('platinum');

  constructor() {
    effect(() => {
      const championId = this.championId();

      if (championId) {
        void this.loadChampion(championId);
      }
    });
  }

  async loadChampion(championId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.champion.set(null);
    this.builds.set(null);
    this.activeTier.set('platinum');

    try {
      const [champion, builds] = await Promise.all([
        firstValueFrom(this.riotApi.getChampionDetail(championId)),
        firstValueFrom(this.riotApi.getChampionPopularBuilds(championId)),
      ]);

      this.champion.set(champion);
      this.builds.set(builds);
      this.activeTier.set(builds.tiers.find((tier) => tier.key === 'platinum')?.key ?? builds.tiers[0]?.key ?? 'platinum');
    } catch {
      this.error.set('Impossible de charger les stuffs populaires. Verifie que npm run proxy tourne bien a cote de ng serve.');
    } finally {
      this.loading.set(false);
    }
  }

  selectTier(tierKey: string): void {
    this.activeTier.set(tierKey);
  }

  selectedTier(): ChampionBuildTier | null {
    const builds = this.builds();

    if (!builds) {
      return null;
    }

    return builds.tiers.find((tier) => tier.key === this.activeTier()) ?? builds.tiers[0] ?? null;
  }

  formatPercent(value: number): string {
    return `${this.percentFormatter.format(value)}%`;
  }

  formatItemLabel(item: ChampionBuildItem): string {
    return item.quantity > 1 ? `${item.name} x${item.quantity}` : item.name;
  }

  tierTrackBy(_: number, tier: ChampionBuildTier): string {
    return tier.key;
  }

  rowTrackBy(index: number, row: ChampionBuildRow): string {
    const ids = row.items.map((item) => `${item.id}-${item.quantity}`).join('-');
    return ids || String(index);
  }

  itemTrackBy(_: number, item: ChampionBuildItem): string {
    return `${item.id}-${item.quantity}`;
  }
}
