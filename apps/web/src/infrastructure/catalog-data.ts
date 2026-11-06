import type { Exercise } from '@repforge/domain';
import type { Catalog } from '../application/ports';

/**
 * Catalogue d'exercices classiques. Les identifiants sont stables : ils sont
 * référencés par les programmes et l'historique (et plus tard par l'API).
 */
const exercises: readonly Exercise[] = [
  // Pectoraux
  { id: 'bench-press', name: 'Développé couché (barre)', muscleGroup: 'chest', equipment: 'barbell', inputKind: 'load', loadConvention: 'Poids total, barre incluse' },
  { id: 'dumbbell-bench-press', name: 'Développé couché (haltères)', muscleGroup: 'chest', equipment: 'dumbbell', inputKind: 'load', loadConvention: 'Poids par haltère' },
  { id: 'incline-dumbbell-press', name: 'Développé incliné (haltères)', muscleGroup: 'chest', equipment: 'dumbbell', inputKind: 'load', loadConvention: 'Poids par haltère' },
  { id: 'chest-press-machine', name: 'Développé assis (machine)', muscleGroup: 'chest', equipment: 'machine', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  { id: 'cable-fly', name: 'Écartés à la poulie', muscleGroup: 'chest', equipment: 'cable', inputKind: 'load', loadConvention: 'Charge affichée, pour une poulie' },
  { id: 'push-up', name: 'Pompes', muscleGroup: 'chest', equipment: 'bodyweight', inputKind: 'added_weight', loadConvention: 'Lest ajouté (vide si aucun)' },
  { id: 'dip', name: 'Dips', muscleGroup: 'chest', equipment: 'bodyweight', inputKind: 'added_weight', loadConvention: 'Lest ajouté, hors poids du corps' },
  { id: 'assisted-dip', name: 'Dips assistés', muscleGroup: 'chest', equipment: 'machine', inputKind: 'assistance', loadConvention: 'Assistance retirée de ton poids' },
  // Dos
  { id: 'pull-up', name: 'Tractions', muscleGroup: 'back', equipment: 'bodyweight', inputKind: 'added_weight', loadConvention: 'Lest ajouté, hors poids du corps' },
  { id: 'assisted-pull-up', name: 'Tractions assistées', muscleGroup: 'back', equipment: 'machine', inputKind: 'assistance', loadConvention: 'Assistance retirée de ton poids' },
  { id: 'barbell-row', name: 'Rowing barre', muscleGroup: 'back', equipment: 'barbell', inputKind: 'load', loadConvention: 'Poids total, barre incluse' },
  { id: 'dumbbell-row', name: 'Rowing haltère (un bras)', muscleGroup: 'back', equipment: 'dumbbell', inputKind: 'load', loadConvention: 'Poids de l’haltère' },
  { id: 'lat-pulldown', name: 'Tirage vertical', muscleGroup: 'back', equipment: 'cable', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  { id: 'seated-cable-row', name: 'Tirage horizontal (poulie)', muscleGroup: 'back', equipment: 'cable', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  { id: 'deadlift', name: 'Soulevé de terre', muscleGroup: 'back', equipment: 'barbell', inputKind: 'load', loadConvention: 'Poids total, barre incluse' },
  // Épaules
  { id: 'overhead-press', name: 'Développé militaire', muscleGroup: 'shoulders', equipment: 'barbell', inputKind: 'load', loadConvention: 'Poids total, barre incluse' },
  { id: 'dumbbell-shoulder-press', name: 'Développé épaules (haltères)', muscleGroup: 'shoulders', equipment: 'dumbbell', inputKind: 'load', loadConvention: 'Poids par haltère' },
  { id: 'lateral-raise', name: 'Élévations latérales', muscleGroup: 'shoulders', equipment: 'dumbbell', inputKind: 'load', loadConvention: 'Poids par haltère' },
  { id: 'face-pull', name: 'Face pull', muscleGroup: 'shoulders', equipment: 'cable', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  // Bras
  { id: 'barbell-curl', name: 'Curl barre', muscleGroup: 'arms', equipment: 'barbell', inputKind: 'load', loadConvention: 'Poids total, barre incluse' },
  { id: 'dumbbell-curl', name: 'Curl haltères', muscleGroup: 'arms', equipment: 'dumbbell', inputKind: 'load', loadConvention: 'Poids par haltère' },
  { id: 'hammer-curl', name: 'Curl marteau', muscleGroup: 'arms', equipment: 'dumbbell', inputKind: 'load', loadConvention: 'Poids par haltère' },
  { id: 'cable-triceps-extension', name: 'Extension triceps (poulie)', muscleGroup: 'arms', equipment: 'cable', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  { id: 'skull-crusher', name: 'Barre au front', muscleGroup: 'arms', equipment: 'barbell', inputKind: 'load', loadConvention: 'Poids total, barre incluse' },
  // Jambes
  { id: 'back-squat', name: 'Squat (barre)', muscleGroup: 'legs', equipment: 'barbell', inputKind: 'load', loadConvention: 'Poids total, barre incluse' },
  { id: 'leg-press', name: 'Presse à cuisses', muscleGroup: 'legs', equipment: 'machine', inputKind: 'load', loadConvention: 'Charge ajoutée, hors chariot' },
  { id: 'romanian-deadlift', name: 'Soulevé de terre roumain', muscleGroup: 'legs', equipment: 'barbell', inputKind: 'load', loadConvention: 'Poids total, barre incluse' },
  { id: 'lying-leg-curl', name: 'Leg curl', muscleGroup: 'legs', equipment: 'machine', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  { id: 'leg-extension', name: 'Leg extension', muscleGroup: 'legs', equipment: 'machine', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  { id: 'dumbbell-lunge', name: 'Fentes (haltères)', muscleGroup: 'legs', equipment: 'dumbbell', inputKind: 'load', loadConvention: 'Poids par haltère' },
  { id: 'hip-thrust', name: 'Hip thrust (barre)', muscleGroup: 'legs', equipment: 'barbell', inputKind: 'load', loadConvention: 'Poids total, barre incluse' },
  { id: 'standing-calf-raise', name: 'Mollets debout', muscleGroup: 'legs', equipment: 'machine', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  // Abdos
  { id: 'cable-crunch', name: 'Crunch à la poulie', muscleGroup: 'abs', equipment: 'cable', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  { id: 'hanging-leg-raise', name: 'Relevés de jambes suspendu', muscleGroup: 'abs', equipment: 'bodyweight', inputKind: 'added_weight', loadConvention: 'Lest ajouté (vide si aucun)' },
  { id: 'plank', name: 'Gainage', muscleGroup: 'abs', equipment: 'bodyweight', inputKind: 'duration', loadConvention: 'Durée en secondes, lest facultatif' },
];

export const staticCatalog: Catalog = {
  all: () => exercises,
};
