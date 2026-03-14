import type { Page } from './page.model';
import type { PageLink } from './page.model';
import type { ModuleLink } from './module.model';

/**
 * Projet : liste de pages et liens entre pages / modules.
 */
export interface Project {
  id: string;
  name: string;
  createdAt: string;
  pages: Page[];
  pageLinks: PageLink[];
  moduleLinks: ModuleLink[];
}
