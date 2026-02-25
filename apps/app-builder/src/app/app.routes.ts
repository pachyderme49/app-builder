import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'projects',
  },
  {
    path: 'projects',
    loadComponent: () =>
      import('./projects/projects-page').then((m) => m.ProjectsPage),
  },
  {
    path: '**',
    redirectTo: 'projects',
  },
];
