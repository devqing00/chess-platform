/**
 * Implementation of the Glicko-2 rating system
 * Designed by Mark E. Glickman (Boston University)
 * Standard rating system used by Lichess and competitive chess organizations.
 */

export interface Glicko2Rating {
  rating: number; // r: e.g. 1500
  rd: number; // Rating Deviation: e.g. 200 (provisional: 350, established: < 75)
  vol: number; // Volatility: e.g. 0.06
}

const SCALE = 173.7178;
const TAU = 0.5; // System constant constraining volatility over time (0.3 to 1.2)
const EPSILON = 0.000001;

function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

function E(mu: number, mu_j: number, phi_j: number): number {
  return 1 / (1 + Math.exp(-g(phi_j) * (mu - mu_j)));
}

/**
 * Calculates updated Glicko-2 rating after a match or puzzle attempt
 * @param player Current player's rating
 * @param opponent Opponent / puzzle rating
 * @param score Match outcome (1.0 = win/solve, 0.5 = draw, 0.0 = loss/fail)
 */
export function calculateGlicko2Update(
  player: Glicko2Rating,
  opponent: Glicko2Rating,
  score: number // 1 for win, 0 for loss
): Glicko2Rating {
  // Step 2: Convert to Glicko-2 scale
  const mu = (player.rating - 1500) / SCALE;
  const phi = player.rd / SCALE;
  const sigma = player.vol;

  const mu_j = (opponent.rating - 1500) / SCALE;
  const phi_j = opponent.rd / SCALE;

  // Step 3: Compute variance v
  const g_phi = g(phi_j);
  const e_val = E(mu, mu_j, phi_j);
  const v = 1 / (g_phi * g_phi * e_val * (1 - e_val));

  // Step 4: Compute estimated improvement delta
  const delta = v * g_phi * (score - e_val);

  // Step 5: Determine new volatility sigma' using Illinois algorithm
  const a = Math.log(sigma * sigma);
  const f = (x: number): number => {
    const exp_x = Math.exp(x);
    const d2 = delta * delta;
    const p2_v_exp = phi * phi + v + exp_x;
    const term1 = (exp_x * (d2 - p2_v_exp)) / (2 * p2_v_exp * p2_v_exp);
    const term2 = (x - a) / (TAU * TAU);
    return term1 - term2;
  };

  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) {
      k++;
    }
    B = a - k * TAU;
  }

  let fA = f(A);
  let fB = f(B);

  while (Math.abs(B - A) > EPSILON) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
  }

  const new_sigma = Math.exp(A / 2);

  // Step 6: Update rating deviation to pre-rating period value
  const phi_star = Math.sqrt(phi * phi + new_sigma * new_sigma);

  // Step 7: Update rating and RD to new values
  const new_phi = 1 / Math.sqrt(1 / (phi_star * phi_star) + 1 / v);
  const new_mu = mu + new_phi * new_phi * g_phi * (score - e_val);

  // Step 8: Convert back to original scale
  const updatedRating = Math.round(new_mu * SCALE + 1500);
  const updatedRd = Math.max(30, Math.min(350, Math.round(new_phi * SCALE)));
  const updatedVol = parseFloat(new_sigma.toFixed(5));

  return {
    rating: updatedRating,
    rd: updatedRd,
    vol: updatedVol,
  };
}
