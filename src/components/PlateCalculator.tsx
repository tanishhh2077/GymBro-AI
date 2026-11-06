import { useId, useState } from 'react';
import type { WeightUnit } from '@/types/workout';
import { calculatePlates, type PlateInventory, type PlateResult } from '@/core/plateCalculator';

const inputClass = 'mt-1 w-full rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-base text-white';

export function PlateCalculator({ unit }: { unit: WeightUnit }) {
  const id = useId();
  const [target, setTarget] = useState('');
  const [bar, setBar] = useState(unit === 'lb' ? '45' : '20');
  const [inventory, setInventory] = useState<PlateInventory[]>(() =>
    (unit === 'lb' ? ['45', '35', '25', '10', '5', '2.5'] : ['25', '20', '15', '10', '5', '2.5'])
      .map(weight => ({ weight, pairs: '1' })));
  const [result, setResult] = useState<PlateResult | null>(null);
  function changeInventory(index: number, field: keyof PlateInventory, value: string) {
    setInventory(previous => previous.map((entry, i) => i === index ? { ...entry, [field]: value } : entry));
    setResult(null);
  }
  return <details className="rounded-xl border border-white/10 bg-ink-900/50 p-4">
    <summary className="cursor-pointer text-lg font-semibold text-white">Plate calculator</summary>
    <p className="mt-3 text-sm text-slate-400">Optional balanced barbell loading in {unit}. Review the suggested inventory for your equipment. One pair means one plate on each side.</p>
    <p className="mt-2 text-xs text-slate-500">This calculator does not log or change sets. Inputs stay here until you leave this screen or reload. Log actual weight with the existing set controls.</p>
    <form aria-label="Plate calculator" noValidate className="mt-4 space-y-4" onSubmit={event => {
      event.preventDefault(); setResult(calculatePlates(target, bar, inventory));
    }}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><label htmlFor={`${id}-target`} className="text-sm text-slate-300">Total target weight ({unit})</label>
          <input id={`${id}-target`} inputMode="decimal" maxLength={20} className={inputClass} value={target}
            onChange={event => { setTarget(event.target.value); setResult(null); }} /></div>
        <div><label htmlFor={`${id}-bar`} className="text-sm text-slate-300">Bar weight ({unit})</label>
          <input id={`${id}-bar`} inputMode="decimal" maxLength={20} className={inputClass} value={bar}
            onChange={event => { setBar(event.target.value); setResult(null); }} /></div>
      </div>
      <fieldset className="min-w-0 space-y-3">
        <legend className="text-sm font-semibold text-slate-300">Plate inventory</legend>
        {inventory.map((entry, index) => <div key={index} className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1"><label htmlFor={`${id}-plate-${index}`} className="text-sm text-slate-300">Plate weight {index + 1} ({unit})</label>
            <input id={`${id}-plate-${index}`} inputMode="decimal" maxLength={20} className={inputClass} value={entry.weight}
              onChange={event => changeInventory(index, 'weight', event.target.value)} /></div>
          <div className="min-w-0 flex-1"><label htmlFor={`${id}-pairs-${index}`} className="text-sm text-slate-300">Available pairs {index + 1}</label>
            <input id={`${id}-pairs-${index}`} inputMode="numeric" maxLength={3} className={inputClass} value={entry.pairs}
              onChange={event => changeInventory(index, 'pairs', event.target.value)} /></div>
          <button type="button" className="btn-ghost" aria-label={`Remove plate denomination ${index + 1}`}
            onClick={() => { setInventory(previous => previous.filter((_, i) => i !== index)); setResult(null); }}>Remove</button>
        </div>)}
        <button type="button" className="btn-ghost" disabled={inventory.length >= 12}
          onClick={() => { setInventory(previous => [...previous, { weight: '', pairs: '0' }]); setResult(null); }}>Add denomination</button>
      </fieldset>
      <p className="text-xs text-slate-500">Up to 12 denominations, 100 pairs each, weights 0–10000 with up to 3 decimals; plate weights must be positive. Very fine-grained weight ranges may exceed the calculation limit.</p>
      <button type="submit" className="btn-ghost">Calculate plates</button>
    </form>
    {result?.status === 'exact' && <output className="mt-4 block space-y-2 text-sm text-slate-300" aria-live="polite">
      <p className="font-semibold text-white">Resulting total: {result.total} {unit}</p>
      {result.plates.length ? <><p>Plates per side (fewest plates for an exact total):</p>
        <ul className="list-inside list-disc">{result.plates.map(plate => <li key={plate.weight}>{plate.count} × {plate.weight} {unit}</li>)}</ul>
        <p>Load the same plates on both sides.</p></> : <p>Bar only — no plates needed.</p>}
    </output>}
    {result && result.status !== 'exact' && <p role={result.status === 'invalid' ? 'alert' : 'status'} className="mt-4 text-sm text-slate-300">{result.message}</p>}
  </details>;
}
