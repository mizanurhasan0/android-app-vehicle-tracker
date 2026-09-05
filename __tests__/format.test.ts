import { toPoisha } from '../src/utils/format';
describe('payment amounts', () => {
  it('converts taka to exact integer poisha', () => {
    expect(toPoisha('1500')).toBe(150000);
    expect(toPoisha('0.29')).toBe(29);
    expect(toPoisha('120.5')).toBe(12050);
  });
  it.each(['0', '-1', '1.001', 'NaN', '1e3', '1000001', ''])(
    'rejects unsupported amount %s',
    value => {
      expect(() => toPoisha(value)).toThrow();
    },
  );
});
