/** « de Marthe », « d'Inès » : élision devant une voyelle ou un h. */
export function ofName(name: string): string {
  return /^[aeiouyhàâäéèêëîïôöùûüœ]/i.test(name) ? `d'${name}` : `de ${name}`;
}
