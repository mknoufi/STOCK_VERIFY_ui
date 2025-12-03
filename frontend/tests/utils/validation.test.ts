import { normalizeBarcode, validateBarcode, validateMRP, validateQuantity, validateSessionName } from '../../src/utils/validation';

describe('validation utils', () => {
  it('validates session names', () => {
    expect(validateSessionName('Floor 1', 'Rack A')).toMatchObject({ valid: true, value: 'Floor 1 - Rack A' });
    expect(validateSessionName('', 'Rack A')).toMatchObject({ valid: false });
    expect(
      validateSessionName('F'.repeat(60), 'R'.repeat(60))
    ).toMatchObject({ valid: false });
    expect(validateSessionName(`O'Neil`, `Rack "A"`).value).toBe('ONeil - Rack A');
  });

  it('normalizes numeric barcodes', () => {
    expect(normalizeBarcode('123')).toBe('000123');
    expect(normalizeBarcode('001234')).toBe('001234');
  });

  it('validates barcodes', () => {
    expect(validateBarcode('ABC123').valid).toBe(true);
    expect(validateBarcode('')).toMatchObject({ valid: false });
  });

  it('validates quantity', () => {
    expect(validateQuantity('10').value).toBe(10);
    expect(validateQuantity('-5').valid).toBe(false);
  });

  it('validates mrp', () => {
    expect(validateMRP('12.5').value).toBe(12.5);
    expect(validateMRP('-1').valid).toBe(false);
  });
});
