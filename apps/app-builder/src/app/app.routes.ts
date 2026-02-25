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
    path: 'projects/:id',
    loadComponent: () =>
      import('./projects/project-edit-page').then((m) => m.ProjectEditPage),
  },
  {
    path: '**',
    redirectTo: 'projects',
  },
];
