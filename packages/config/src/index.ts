/**
 * Configuration partagée entre apps/api et apps/tablet-app.
 *
 * Contient les constantes métier (paliers de pénalité, tolérance par
 * défaut, etc.) afin qu'elles soient définies UN SEUL ENDROIT et
 * réutilisables par le calcul de pénalité côté API et par la tablette.
 */

// ---------------------------------------------------------------------------
// Paliers de pénalité par défaut (FCFA)
// ---------------------------------------------------------------------------
// Ces valeurs sont utilisées comme filet de sécurité uniquement si la table
// PenaltyRule est vide (voir PenaltyRulesService.findAllActive()).
// En production, les paliers sont configurables via l'interface admin.
export const DEFAULT_PENALTY_TIERS = [
  { fromMinutes: 1, toMinutes: 10, amount: 500 },
  { fromMinutes: 11, toMinutes: 30, amount: 1000 },
  { fromMinutes: 31, toMinutes: 60, amount: 2000 },
  { fromMinutes: 61, toMinutes: null, amount: 5000 },
];

// ---------------------------------------------------------------------------
// Tolérance par défaut (minutes)
// ---------------------------------------------------------------------------
// Nombre de minutes de retard tolérées avant qu'un pointage ne soit
// considéré comme "en retard" et ne génère une pénalité.
// Les scheduels individuels peuvent surcharger cette valeur.
export const DEFAULT_TOLERANCE_MINUTES = 10;
