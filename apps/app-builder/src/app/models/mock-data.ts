import { createGuid } from './id.util';
import type { Page, PageType } from './page.model';
import type { Module, ModuleType } from './module.model';
import type { PageLink } from './page.model';
import type { ModuleLink } from './module.model';

/**
 * Templates de pages préfaites pour la palette (glisser-déposer).
 */
export interface PageTemplate {
  id: string;
  name: string;
  type: PageType;
}

export const MOCK_PAGE_TEMPLATES: PageTemplate[] = [
  { id: 'formulaire', name: 'Formulaire', type: 'formulaire' },
  { id: 'connexion', name: 'Connexion', type: 'connexion' },
  { id: 'liste', name: 'Liste', type: 'liste' },
];

/**
 * Templates de modules pour la palette (glisser-déposer sur une page).
 */
export interface ModuleTemplate {
  id: string;
  name: string;
  type: ModuleType;
}

export const MOCK_MODULE_TEMPLATES: ModuleTemplate[] = [
  { id: 'formulaire', name: 'Formulaire', type: 'formulaire' },
  { id: 'input', name: 'Input', type: 'input' },
  { id: 'bouton', name: 'Bouton', type: 'bouton' },
  { id: 'tableau', name: 'Tableau', type: 'tableau' },
];

/**
 * Crée les pages et liens par défaut (mock) pour un nouveau projet ou migration.
 */
export function createDefaultPagesAndLinks(): {
  pages: Page[];
  pageLinks: PageLink[];
  moduleLinks: ModuleLink[];
} {
  const authId = createGuid();
  const homeId = createGuid();
  const contactId = createGuid();
  const productsId = createGuid();

  const pages: Page[] = [
    { id: authId, name: 'auth', type: 'connexion', config: {}, modules: [], position: { x: 0, y: 0 } },
    { id: homeId, name: 'home', type: 'liste', config: {}, modules: [], position: { x: 220, y: 0 } },
    { id: contactId, name: 'Contact', type: 'formulaire', config: {}, modules: [], position: { x: 440, y: 120 } },
    { id: productsId, name: 'Products', type: 'liste', config: {}, modules: [], position: { x: 440, y: -120 } },
  ];

  const pageLinks: PageLink[] = [
    { id: createGuid(), sourcePageId: authId, targetPageId: homeId },
    { id: createGuid(), sourcePageId: homeId, targetPageId: contactId },
    { id: createGuid(), sourcePageId: homeId, targetPageId: productsId },
  ];

  const moduleLinks: ModuleLink[] = [];

  return { pages, pageLinks, moduleLinks };
}

/**
 * Crée un module à partir d'un template (palette).
 */
export function createModuleFromTemplate(
  template: ModuleTemplate,
  position?: { x: number; y: number }
): Module {
  return {
    id: createGuid(),
    name: template.name,
    type: template.type,
    config: {},
    position,
  };
}

/**
 * Crée une page à partir d'un template (palette).
 */
export function createPageFromTemplate(
  template: PageTemplate,
  position: { x: number; y: number }
): Page {
  return {
    id: createGuid(),
    name: template.name,
    type: template.type,
    config: {},
    modules: [],
    position,
  };
}
