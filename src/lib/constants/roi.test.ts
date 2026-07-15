import { describe, it, expect } from 'vitest';
import { ROI_CONSTANTS } from './roi';

describe('ROI Constants', () => {
  it('should have Chile central radiation average', () => {
    expect(ROI_CONSTANTS.radiacionGhi).toBe(1600);
  });

  it('should have average electricity tariff', () => {
    expect(ROI_CONSTANTS.tarifaEst).toBe(180);
  });

  it('should have performance ratio of 0.75', () => {
    expect(ROI_CONSTANTS.performanceRatio).toBe(0.75);
  });

  it('should be readonly (all properties defined)', () => {
    expect(Object.keys(ROI_CONSTANTS)).toHaveLength(3);
  });
});
