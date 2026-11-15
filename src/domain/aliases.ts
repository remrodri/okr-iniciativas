import { DomainError } from './errors';
import { LIMITS } from './limits';

export const NEUTRAL_ALIASES: readonly string[] = [
  'Faro',
  'Nexo',
  'Prisma',
  'Brújula',
  'Ancla',
  'Atlas',
  'Aurora',
  'Bruma',
  'Cauce',
  'Cima',
  'Cometa',
  'Coral',
  'Delta',
  'Eco',
  'Enigma',
  'Fénix',
  'Flujo',
  'Foco',
  'Forja',
  'Gema',
  'Horizonte',
  'Imán',
  'Índigo',
  'Lago',
  'Lince',
  'Lumen',
  'Marea',
  'Monte',
  'Nube',
  'Oasis',
  'Onda',
  'Ópalo',
  'Origen',
  'Palma',
  'Pilar',
  'Polo',
  'Puente',
  'Quásar',
  'Reflejo',
  'Río',
  'Semilla',
  'Sendero',
  'Sierra',
  'Sol',
  'Sonar',
  'Tundra',
  'Vela',
  'Vértice',
  'Vía',
  'Zenit',
];

export type RandomSource = () => number;

export function assignUniqueAliases(
  count: number,
  random: RandomSource = Math.random,
): string[] {
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > LIMITS.participantsMax
  ) {
    throw new DomainError(
      'INVALID_ALIAS_COUNT',
      `Se pueden asignar entre 1 y ${LIMITS.participantsMax} alias.`,
      'count',
    );
  }

  const pool = [...NEUTRAL_ALIASES];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = pool[index];
    const swap = pool[swapIndex];
    if (current !== undefined && swap !== undefined) {
      pool[index] = swap;
      pool[swapIndex] = current;
    }
  }

  return pool.slice(0, count);
}
