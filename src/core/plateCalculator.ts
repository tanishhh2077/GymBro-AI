export interface PlateInventory { weight: string; pairs: string }
export type PlateResult =
  | { status: 'exact'; total: number; plates: { weight: number; count: number }[] }
  | { status: 'invalid' | 'unattainable'; message: string };

// Parse the decimal text directly into thousandths; do not multiply floats.
function thousandths(text: string): number | null {
  const value = text.trim();
  if (!/^\d+(?:\.\d{1,3})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const result = Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
  return Number.isSafeInteger(result) && result <= 10_000_000 ? result : null;
}
function gcd(a: number, b: number): number {
  while (b) { const remainder = a % b; a = b; b = remainder; }
  return a;
}

export function calculatePlates(targetText: string, barText: string, inventory: PlateInventory[]): PlateResult {
  const invalid = (message: string): PlateResult => ({ status: 'invalid', message });
  const unattainable: PlateResult = { status: 'unattainable', message: 'No exact balanced loading is possible with these plate denominations and available pairs. Change the target or inventory.' };
  const target = thousandths(targetText), bar = thousandths(barText);
  if (target === null || bar === null) return invalid('Target and bar weight must be between 0 and 10000, with up to 3 decimal places.');
  if (inventory.length > 12) return invalid('Use at most 12 plate denominations.');
  const entries: { weight: number; pairs: number }[] = [];
  const seen = new Set<number>();
  for (const entry of inventory) {
    const weight = thousandths(entry.weight);
    if (weight === null || weight === 0) return invalid('Each plate weight must be greater than 0 and at most 10000, with up to 3 decimal places.');
    if (!/^\d+$/.test(entry.pairs.trim()) || Number(entry.pairs) > 100) return invalid('Available pairs must be whole numbers from 0 to 100.');
    if (seen.has(weight)) return invalid('Use one row per plate denomination; combine its available pairs.');
    seen.add(weight);
    if (Number(entry.pairs) > 0) entries.push({ weight, pairs: Number(entry.pairs) });
  }
  if (target < bar) return invalid('The target is below the bar weight. Increase the target or use a lighter bar.');
  const remaining = target - bar;
  if (!remaining) return { status: 'exact', total: bar / 1000, plates: [] };
  entries.sort((a, b) => b.weight - a.weight);
  const divisor = entries.reduce((value, entry) => gcd(value, entry.weight * 2), 0);
  if (!divisor || remaining % divisor !== 0) return unattainable;
  const goal = remaining / divisor;
  if (goal > 1_000_000) return invalid('This weight range with such small fractional plates exceeds the calculator limit. Use coarser denominations or a smaller target.');

  // Bounded minimum-coin dynamic programming. Each row uses only the previous
  // inventory row, so a pair cannot be reused beyond its available count.
  let costs = new Int32Array(goal + 1).fill(10_000);
  costs[0] = 0;
  const choices: Uint8Array[] = [];
  const queue = new Int32Array(goal + 1);
  for (const entry of entries) {
    const step = entry.weight * 2 / divisor;
    const next = new Int32Array(goal + 1).fill(10_000);
    const chosen = new Uint8Array(goal + 1);
    for (let residue = 0; residue < step && residue <= goal; residue++) {
      let head = 0, tail = 0;
      for (let k = 0, amount = residue; amount <= goal; k++, amount += step) {
        // Sliding minimum of previousCost[j] - j for k-pairs <= j <= k.
        // This avoids trying every possible pair count at every weight.
        while (head < tail && queue[head] < k - entry.pairs) head++;
        const score = costs[amount] - k;
        while (head < tail && costs[residue + queue[tail - 1] * step] - queue[tail - 1] >= score) tail--;
        queue[tail++] = k;
        const previous = queue[head];
        next[amount] = costs[residue + previous * step] + k - previous;
        chosen[amount] = k - previous;
      }
    }
    choices.push(chosen);
    costs = next;
  }
  if (costs[goal] >= 10_000) return unattainable;
  let amount = goal;
  const plates: { weight: number; count: number }[] = [];
  for (let i = entries.length - 1; i >= 0; i--) {
    const count = choices[i][amount];
    if (count) plates.push({ weight: entries[i].weight / 1000, count });
    amount -= count * entries[i].weight * 2 / divisor;
  }
  plates.reverse();
  return { status: 'exact', total: target / 1000, plates };
}
