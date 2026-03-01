import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

/**
 * Palette brand : primary #E34F62, secondary #FB7A6B
 * Override de toutes les variables PrimeNG pour utiliser ces couleurs.
 */
const brandPalette = {
  25: '#fef5f6',
  50: '#fdeced',
  100: '#fbd9dc',
  200: '#f7b5bb',
  300: '#f28a94',
  400: '#FB7A6B',
  500: '#ef5d6e',
  600: '#E34F62',
  700: '#c73d4f',
  800: '#a53343',
  900: '#892f3c',
  950: '#4a171f',
};

export const AppTheme = definePreset(Aura, {
  semantic: {
    primary: brandPalette,
  },
});
