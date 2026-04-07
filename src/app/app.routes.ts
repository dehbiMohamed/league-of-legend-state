import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'champions',
  },
  {
    path: 'champions',
    loadComponent: () =>
      import('./pages/champion-list/champion-list.component').then((module) => module.ChampionListComponent),
  },
  {
    path: 'champions/:id',
    loadComponent: () =>
      import('./pages/champion-detail/champion-detail.component').then((module) => module.ChampionDetailComponent),
  },
  {
    path: '**',
    redirectTo: 'champions',
  },
];
