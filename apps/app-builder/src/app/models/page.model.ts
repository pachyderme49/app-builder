import type { Module } from './module.model';

/**
 * Configuration dynamique d'une page (clé/valeur).
 */
export type PageConfig = Record<string, unknown>;

/**
 * Type d'affichage de page (formulaire, connexion, liste, etc.).
 */
export type PageType = 'formulaire' | 'connexion' | 'liste';

/**
 * Position de la page sur le canvas (graph des pages).
 */
export interface PagePosition {
  x: number;
  y: number;
}

/**
 * Page : nom, configuration dynamique, modules.
 * Une page peut être reliée à plusieurs autres pages ou à elle-même (PageLink).
 */
export interface Page {
  id: string;
  name: string;
  type: PageType;
  config: PageConfig;
  modules: Module[];
  position?: PagePosition;
}

/**
 * Lien entre deux pages (ou une page vers elle-même).
 */
export interface PageLink {
  id: string;
  sourcePageId: string;
  targetPageId: string;
}
