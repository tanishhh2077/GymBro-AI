import { expect, type Locator } from '@playwright/test';

export async function expectReadable(locator: Locator) {
  const contrast = await locator.evaluate(element => {
    function channels(value: string) { return value.match(/[\d.]+/g)!.map(Number); }
    function composite(color: number[], background: number[]) {
      const alpha = color[3] ?? 1;
      return color.slice(0, 3).map((channel, index) => channel * alpha + background[index] * (1 - alpha));
    }
    function luminance(color: number[]) {
      const linear = color.map(channel => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    }
    const backgrounds: number[][] = [];
    for (let node: Element | null = element; node; node = node.parentElement) {
      backgrounds.push(channels(getComputedStyle(node).backgroundColor));
    }
    const background = backgrounds.reverse().reduce((result, color) => composite(color, result), [255, 255, 255]);
    const foreground = composite(channels(getComputedStyle(element).color), background);
    const light = Math.max(luminance(foreground), luminance(background));
    const dark = Math.min(luminance(foreground), luminance(background));
    return { ratio: (light + 0.05) / (dark + 0.05), foreground, background };
  });
  expect(contrast.ratio, JSON.stringify(contrast)).toBeGreaterThanOrEqual(4.5);
}
