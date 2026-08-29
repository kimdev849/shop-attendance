/**
 * Penalties module constants.
 * Default penalty tiers (used for seed and fallback).
 * The actual rules are stored in the database (PenaltyRule table).
 */
import { DEFAULT_PENALTY_TIERS } from "@shop-attendance/config";

export const PENALTY_DEFAULT_TIERS = DEFAULT_PENALTY_TIERS;

/** Currency used for penalty amounts */
export const CURRENCY = "FCFA";
