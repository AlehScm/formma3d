/** Junta classes, ignorando o que for falso. Evita template string com `? '' :` espalhado. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
