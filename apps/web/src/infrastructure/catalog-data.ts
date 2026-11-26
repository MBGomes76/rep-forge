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
  { id: 'pec-deck', name: 'Pec deck (écartés machine)', muscleGroup: 'chest', equipment: 'machine', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  { id: 'push-up', name: 'Pompes', muscleGroup: 'chest', equipment: 'bodyweight', inputKind: 'added_weight', loadConvention: 'Lest ajouté (vide si aucun)' },
  { id: 'dip', name: 'Dips', muscleGroup: 'chest', equipment: 'bodyweight', inputKind: 'added_weight', loadConvention: 'Lest ajouté, hors poids du corps' },
  { id: 'assisted-dip', name: 'Dips assistés', muscleGroup: 'chest', equipment: 'machine', inputKind: 'assistance', loadConvention: 'Assistance retirée de ton poids' },
  // Dos
  { id: 'pull-up', name: 'Tractions pronation', muscleGroup: 'back', equipment: 'bodyweight', inputKind: 'added_weight', loadConvention: 'Lest ajouté, hors poids du corps' },
  { id: 'chin-up', name: 'Tractions supination', muscleGroup: 'back', equipment: 'bodyweight', inputKind: 'added_weight', loadConvention: 'Lest ajouté, hors poids du corps' },
  { id: 'neutral-grip-pull-up', name: 'Tractions prise neutre', muscleGroup: 'back', equipment: 'bodyweight', inputKind: 'added_weight', loadConvention: 'Lest ajouté, hors poids du corps' },
  { id: 'assisted-pull-up', name: 'Tractions assistées', muscleGroup: 'back', equipment: 'machine', inputKind: 'assistance', loadConvention: 'Assistance retirée de ton poids' },
  { id: 'inverted-row', name: 'Tractions australiennes', muscleGroup: 'back', equipment: 'bodyweight', inputKind: 'added_weight', loadConvention: 'Lest ajouté (vide si aucun)' },
  { id: 'dead-hang', name: 'Suspension à la barre (dead hang)', muscleGroup: 'back', equipment: 'bodyweight', inputKind: 'duration', loadConvention: 'Durée en secondes, lest facultatif' },
  { id: 'barbell-row', name: 'Rowing barre', muscleGroup: 'back', equipment: 'barbell', inputKind: 'load', loadConvention: 'Poids total, barre incluse' },
  { id: 'dumbbell-row', name: 'Rowing haltère (un bras)', muscleGroup: 'back', equipment: 'dumbbell', inputKind: 'load', loadConvention: 'Poids de l’haltère' },
  { id: 'lat-pulldown', name: 'Tirage vertical', muscleGroup: 'back', equipment: 'cable', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  { id: 'seated-cable-row', name: 'Tirage horizontal (poulie)', muscleGroup: 'back', equipment: 'cable', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  { id: 'chest-supported-row', name: 'Rowing poitrine appuyée (machine)', muscleGroup: 'back', equipment: 'machine', inputKind: 'load', loadConvention: 'Charge affichée sur la machine' },
  { id: 'deadlift', name: 'Soulevé de terre', muscleGroup: 'back', equipment: 'barbell', inputKind: 'load', loadConvention: 'Poids total, barre incluse' },
  // Épaules
  { id: 'overhead-press', name: 'Développé militaire', muscleGroup: 'shoulders', equipment: 'barbell', inputKind: 'load', loadConvention: 'Poids total, barre incluse' },
  { id: 'dumbbell-shoulder-press', name: 'Développé épaules (haltères)', muscleGroup: 'shoulders', equipment: 'dumbbell', inputKind: 'load', loadConvention: 'Poids par haltère' },
  { id: 'machine-shoulder-press', name: 'Développé épaules (machine)', muscleGroup: 'shoulders', equipment: 'machine', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  { id: 'lateral-raise', name: 'Élévations latérales (haltères)', muscleGroup: 'shoulders', equipment: 'dumbbell', inputKind: 'load', loadConvention: 'Poids par haltère' },
  { id: 'cable-lateral-raise', name: 'Élévations latérales (poulie)', muscleGroup: 'shoulders', equipment: 'cable', inputKind: 'load', loadConvention: 'Charge affichée, pour une poulie' },
  { id: 'reverse-pec-deck', name: 'Oiseau à la machine (reverse pec deck)', muscleGroup: 'shoulders', equipment: 'machine', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  { id: 'face-pull', name: 'Face pull', muscleGroup: 'shoulders', equipment: 'cable', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  { id: 'pike-push-up', name: 'Pompes piquées (pike push-up)', muscleGroup: 'shoulders', equipment: 'bodyweight', inputKind: 'added_weight', loadConvention: 'Lest ajouté (vide si aucun)' },
  // Bras
  { id: 'barbell-curl', name: 'Curl barre', muscleGroup: 'arms', equipment: 'barbell', inputKind: 'load', loadConvention: 'Poids total, barre incluse' },
  { id: 'ez-bar-curl', name: 'Curl barre EZ', muscleGroup: 'arms', equipment: 'barbell', inputKind: 'load', loadConvention: 'Poids total, barre incluse' },
  { id: 'dumbbell-curl', name: 'Curl haltères', muscleGroup: 'arms', equipment: 'dumbbell', inputKind: 'load', loadConvention: 'Poids par haltère' },
  { id: 'cable-curl', name: 'Curl biceps (poulie)', muscleGroup: 'arms', equipment: 'cable', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  { id: 'hammer-curl', name: 'Curl marteau (haltères)', muscleGroup: 'arms', equipment: 'dumbbell', inputKind: 'load', loadConvention: 'Poids par haltère' },
  { id: 'rope-hammer-curl', name: 'Curl marteau (corde, poulie)', muscleGroup: 'arms', equipment: 'cable', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  { id: 'cable-triceps-extension', name: 'Extension triceps (poulie)', muscleGroup: 'arms', equipment: 'cable', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  { id: 'overhead-cable-triceps-extension', name: 'Extension triceps au-dessus de la tête (poulie)', muscleGroup: 'arms', equipment: 'cable', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  { id: 'overhead-dumbbell-triceps-extension', name: 'Extension triceps au-dessus de la tête (haltère)', muscleGroup: 'arms', equipment: 'dumbbell', inputKind: 'load', loadConvention: 'Poids de l’haltère' },
  { id: 'skull-crusher', name: 'Barre au front', muscleGroup: 'arms', equipment: 'barbell', inputKind: 'load', loadConvention: 'Poids total, barre incluse' },
  // Jambes
  { id: 'back-squat', name: 'Squat (barre)', muscleGroup: 'legs', equipment: 'barbell', inputKind: 'load', loadConvention: 'Poids total, barre incluse' },
  { id: 'leg-press', name: 'Presse à cuisses', muscleGroup: 'legs', equipment: 'machine', inputKind: 'load', loadConvention: 'Charge ajoutée, hors chariot' },
  { id: 'hack-squat', name: 'Hack squat', muscleGroup: 'legs', equipment: 'machine', inputKind: 'load', loadConvention: 'Charge ajoutée, hors chariot' },
  { id: 'romanian-deadlift', name: 'Soulevé de terre roumain', muscleGroup: 'legs', equipment: 'barbell', inputKind: 'load', loadConvention: 'Poids total, barre incluse' },
  { id: 'lying-leg-curl', name: 'Leg curl allongé', muscleGroup: 'legs', equipment: 'machine', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  { id: 'seated-leg-curl', name: 'Leg curl assis', muscleGroup: 'legs', equipment: 'machine', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  { id: 'leg-extension', name: 'Leg extension', muscleGroup: 'legs', equipment: 'machine', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  { id: 'dumbbell-lunge', name: 'Fentes (haltères)', muscleGroup: 'legs', equipment: 'dumbbell', inputKind: 'load', loadConvention: 'Poids par haltère' },
  { id: 'bulgarian-split-squat', name: 'Fentes bulgares (pied arrière sur banc)', muscleGroup: 'legs', equipment: 'dumbbell', inputKind: 'load', loadConvention: 'Poids par haltère' },
  { id: 'hip-thrust', name: 'Hip thrust (barre)', muscleGroup: 'legs', equipment: 'barbell', inputKind: 'load', loadConvention: 'Poids total, barre incluse' },
  { id: 'standing-calf-raise', name: 'Mollets debout', muscleGroup: 'legs', equipment: 'machine', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  { id: 'seated-calf-raise', name: 'Mollets assis (machine)', muscleGroup: 'legs', equipment: 'machine', inputKind: 'load', loadConvention: 'Charge affichée sur la machine' },
  // Abdos
  { id: 'cable-crunch', name: 'Crunch à la poulie', muscleGroup: 'abs', equipment: 'cable', inputKind: 'load', loadConvention: 'Charge affichée sur la pile' },
  { id: 'hanging-leg-raise', name: 'Relevés de jambes suspendu', muscleGroup: 'abs', equipment: 'bodyweight', inputKind: 'added_weight', loadConvention: 'Lest ajouté (vide si aucun)' },
  { id: 'plank', name: 'Gainage (planche)', muscleGroup: 'abs', equipment: 'bodyweight', inputKind: 'duration', loadConvention: 'Durée en secondes, lest facultatif' },
  { id: 'side-plank', name: 'Gainage latéral', muscleGroup: 'abs', equipment: 'bodyweight', inputKind: 'duration', loadConvention: 'Durée en secondes, par côté' },
  { id: 'hollow-hold', name: 'Gainage creux (hollow body)', muscleGroup: 'abs', equipment: 'bodyweight', inputKind: 'duration', loadConvention: 'Durée en secondes, lest facultatif' },
  { id: 'dead-bug', name: 'Dead bug', muscleGroup: 'abs', equipment: 'bodyweight', inputKind: 'added_weight', loadConvention: 'Lest ajouté (vide si aucun)' },
];

export const staticCatalog: Catalog = {
  all: () => exercises,
};
