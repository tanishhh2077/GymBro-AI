import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BodyEntry } from '@/types/body';
import { BodyTrendChart } from './BodyTrendChart';

vi.setConfig({ testTimeout: 30_000 });
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('BodyTrendChart', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('renders an empty state when no entries exist', async () => {
    await act(async () => {
      root.render(<BodyTrendChart entries={[]} />);
    });

    expect(container.textContent).toContain('No Body weight entries recorded');
  });

  it('renders single-entry chart correctly with point path', async () => {
    const entries: BodyEntry[] = [
      { id: 'b1', date: 1_700_000_000_000, weight: 180, unit: 'lb' },
    ];

    await act(async () => {
      root.render(<BodyTrendChart entries={entries} />);
    });

    const path = container.querySelector('svg path');
    expect(path).toBeTruthy();
    expect(container.textContent).toContain('180 lb');
  });

  it('renders SVG chart and accessible table for weight entries', async () => {
    const entries: BodyEntry[] = [
      { id: 'b1', date: 1_700_000_000_000, weight: 180, unit: 'lb' },
      { id: 'b2', date: 1_700_100_000_000, weight: 182, unit: 'lb' },
      { id: 'b3', date: 1_700_200_000_000, weight: 179, unit: 'lb' },
    ];

    await act(async () => {
      root.render(<BodyTrendChart entries={entries} />);
    });

    const svg = container.querySelector('svg[role="img"]');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('aria-labelledby')).toBeTruthy();
    expect(svg?.getAttribute('aria-describedby')).toBeTruthy();

    const polyline = container.querySelector('polyline');
    expect(polyline).toBeTruthy();

    // Accessible table
    const table = container.querySelector('table');
    expect(table).toBeTruthy();
    expect(table?.textContent).toContain('180 lb');
    expect(table?.textContent).toContain('182 lb');
    expect(table?.textContent).toContain('179 lb');
  });

  it('shows excluded notice when entries exist in a different unit and allows unit switching', async () => {
    const entries: BodyEntry[] = [
      { id: 'b1', date: 1_700_000_000_000, weight: 180, unit: 'lb' },
      { id: 'b2', date: 1_700_100_000_000, weight: 80, unit: 'kg' },
    ];

    await act(async () => {
      root.render(<BodyTrendChart entries={entries} />);
    });

    // bodyTrend defaults to the unit of latest in-range entry (kg in this case)
    expect(container.textContent).toMatch(/excluded \(different unit\)/i);

    // Both lb and kg buttons should be present
    const lbBtn = [...container.querySelectorAll('button')].find(b => b.textContent?.trim() === 'lb');
    expect(lbBtn).toBeTruthy();

    await act(async () => {
      lbBtn?.click();
    });

    const table = container.querySelector('table');
    expect(table?.textContent).toContain('180 lb');
    expect(container.textContent).toMatch(/excluded \(different unit\)/i);
  });

  it('allows switching trend key to measurements such as waist', async () => {
    const entries: BodyEntry[] = [
      { id: 'b1', date: 1_700_000_000_000, measurements: { waist: 32 }, lengthUnit: 'in' },
      { id: 'b2', date: 1_700_100_000_000, measurements: { waist: 31.5 }, lengthUnit: 'in' },
    ];

    await act(async () => {
      root.render(<BodyTrendChart entries={entries} initialKey="waist" />);
    });

    const table = container.querySelector('table');
    expect(table?.textContent).toContain('32 in');
    expect(table?.textContent).toContain('31.5 in');
  });
});
