import { formatFileSize } from './fileSize';

describe('formatFileSize', () => {
  describe('valid inputs', () => {
    test('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1)).toBe('1 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    test('should format KB correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2048)).toBe('2 KB');
      expect(formatFileSize(1048575)).toBe('1024 KB');
    });

    test('should format MB correctly', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
      expect(formatFileSize(2097152)).toBe('2 MB');
      expect(formatFileSize(1073741823)).toBe('1024 MB');
    });

    test('should format GB correctly', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
      expect(formatFileSize(1610612736)).toBe('1.5 GB');
      expect(formatFileSize(2147483648)).toBe('2 GB');
      expect(formatFileSize(1099511627775)).toBe('1024 GB');
    });

    test('should format TB correctly', () => {
      expect(formatFileSize(1099511627776)).toBe('1 TB');
      expect(formatFileSize(1649267441664)).toBe('1.5 TB');
      expect(formatFileSize(2199023255552)).toBe('2 TB');
    });

    test('should handle very large numbers', () => {
      expect(formatFileSize(1125899906842624)).toBe('1024 TB');
      expect(formatFileSize(Number.MAX_SAFE_INTEGER)).toBe('8192 TB');
    });

    test('should handle decimal precision correctly', () => {
      expect(formatFileSize(1126)).toBe('1.1 KB');
      expect(formatFileSize(1127)).toBe('1.1 KB');
      expect(formatFileSize(1075)).toBe('1 KB'); // 1075/1024 = 1.0498... rounds to 1.0
      expect(formatFileSize(1024.5)).toBe('1 KB');
    });
  });

  describe('edge cases', () => {
    test('should handle fractional bytes', () => {
      expect(formatFileSize(0.5)).toBe('0.5 B');
      expect(formatFileSize(100.7)).toBe('100.7 B');
    });

    test('should handle very small positive numbers', () => {
      expect(formatFileSize(0.001)).toBe('0 B');
      expect(formatFileSize(Number.MIN_VALUE)).toBe('0 B');
    });
  });

  describe('error handling', () => {
    test('should throw error for negative numbers', () => {
      expect(() => formatFileSize(-1)).toThrow('Input must be a non-negative number');
      expect(() => formatFileSize(-1024)).toThrow('Input must be a non-negative number');
    });

    test('should throw error for non-finite numbers', () => {
      expect(() => formatFileSize(NaN)).toThrow('Input must be a finite number');
      expect(() => formatFileSize(Infinity)).toThrow('Input must be a finite number');
      expect(() => formatFileSize(-Infinity)).toThrow('Input must be a finite number');
    });
  });

  describe('type safety', () => {
    test('should accept only numbers', () => {
      // This test ensures TypeScript compilation fails for wrong types
      // The actual runtime test validates the function works with valid numbers
      const validInputs: number[] = [0, 1, 1024, 1048576];
      validInputs.forEach(input => {
        expect(() => formatFileSize(input)).not.toThrow();
      });
    });
  });
});
