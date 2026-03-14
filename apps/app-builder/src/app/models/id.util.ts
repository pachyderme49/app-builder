/**
 * Génère un identifiant unique de type GUID pour la persistance en base.
 */
export function createGuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  const hex = '0123456789abcdef';
  let id = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) id += '-';
    else if (i === 14) id += '4';
    else id += hex[Math.floor(Math.random() * 16)];
  }
  return id;
}
