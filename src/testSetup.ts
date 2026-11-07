import { vi } from 'vitest';

// Most component and App tests start with empty storage and are unrelated to
// the first-run intro, so they see the app as a returning user would. Intro
// tests opt back in with vi.unmock('@/components/introPreference').
vi.mock('@/components/introPreference', async original => ({
  ...await original<typeof import('@/components/introPreference')>(),
  introSeen: () => true,
}));
