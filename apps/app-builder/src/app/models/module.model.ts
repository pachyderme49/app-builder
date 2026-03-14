/**
 * Configuration dynamique d'un module (clé/valeur).
 */
export type ModuleConfig = Record<string, unknown>;

/**
 * Type de module : composant UI, donnée, etc.
 */
export type ModuleType = 'component' | 'data' | 'formulaire' | 'input' | 'bouton' | 'tableau' | 'connexion' | 'liste';

/**
 * Position du module sur le canvas (onglet composants).
 */
export interface ModulePosition {
  x: number;
  y: number;
}

/**
 * Module : nom, type et configuration dynamique.
 * Un module peut être relié à un autre module (même page) ou à une page (ModuleLink).
 */
export interface Module {
  id: string;
  name: string;
  type: ModuleType;
  config: ModuleConfig;
  position?: ModulePosition;
}

/**
 * Lien entre deux modules (même page) ou d'un module vers une page.
 * Exactement un de targetModuleId ou targetPageId doit être renseigné.
 */
export interface ModuleLink {
  id: string;
  sourcePageId: string;
  sourceModuleId: string;
  /** Cible : autre module de la même page (sourcePageId). */
  targetModuleId?: string;
  /** Cible : autre page. */
  targetPageId?: string;
}

export function isModuleLinkToModule(link: ModuleLink): link is ModuleLink & { targetModuleId: string } {
  return link.targetModuleId != null && link.targetModuleId !== '';
}

export function isModuleLinkToPage(link: ModuleLink): link is ModuleLink & { targetPageId: string } {
  return link.targetPageId != null && link.targetPageId !== '';
}
