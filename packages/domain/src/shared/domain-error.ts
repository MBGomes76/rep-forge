/**
 * Violation d'une règle métier (donnée invalide, opération impossible).
 * Le message est en français : il peut être affiché tel quel à l'utilisateur.
 */
export class DomainError extends Error {
  override readonly name = 'DomainError';
}
