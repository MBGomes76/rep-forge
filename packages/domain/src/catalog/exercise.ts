export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'abs';

export type Equipment = 'bodyweight' | 'barbell' | 'dumbbell' | 'machine' | 'cable';

/**
 * Ce que l'on saisit pour une série, et donc comment lire `weightKg` :
 * - `load` : charge soulevée (obligatoire), selon la convention de l'exercice ;
 * - `added_weight` : lest ajouté au poids du corps (vide = poids du corps seul) ;
 * - `assistance` : assistance retirée du poids du corps (moins = plus dur) ;
 * - `duration` : durée tenue en secondes, lest facultatif.
 */
export type InputKind = 'load' | 'added_weight' | 'assistance' | 'duration';

export interface Exercise {
  readonly id: string;
  readonly name: string;
  readonly muscleGroup: MuscleGroup;
  readonly equipment: Equipment;
  readonly inputKind: InputKind;
  /** Texte affiché à l'utilisateur, ex. « Poids par haltère ». */
  readonly loadConvention: string;
}
