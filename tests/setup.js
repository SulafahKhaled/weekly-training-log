// jsdom has no Web Audio / vibration / canvas; the timers call these as best-effort cues.
import { vi } from 'vitest';

vi.mock('../src/lib/audio', () => ({
  beepStart: vi.fn(),
  beepEnd: vi.fn(),
  beepDone: vi.fn(),
  beepTick: vi.fn(),
  vibrate: vi.fn(),
}));
vi.mock('../src/lib/celebrate', () => ({ celebrate: vi.fn() }));
