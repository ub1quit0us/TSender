import { describe, test, expect } from 'vitest';
import { calculateTotal } from "./calculateTotal"

describe('calculateTotal', () => {
    test('should handle comma-separated values', () => {
        expect(calculateTotal('10,20,30')).toBe(60);
        expect(calculateTotal('1.5,2.5,3.5')).toBe(7.5);
    });

    test('should handle newline-separated values', () => {
        expect(calculateTotal('10\n20\n30')).toBe(60);
        expect(calculateTotal('1.5\n2.5\n3.5')).toBe(7.5);
    });

    test('should handle mixed comma and newline separators', () => {
        expect(calculateTotal('10,20\n30')).toBe(60);
        expect(calculateTotal('1.5\n2.5,3.5')).toBe(7.5);
    });

    test('should handle values with extra whitespace', () => {
        expect(calculateTotal(' 10 , 20 , 30 ')).toBe(60);
        expect(calculateTotal('  1.5  \n  2.5  ,  3.5  ')).toBe(7.5);
    });

    test('should handle empty strings', () => {
        expect(calculateTotal('')).toBe(0);
        expect(calculateTotal('   ')).toBe(0);
        expect(calculateTotal('\n\n')).toBe(0);
        expect(calculateTotal(',,')).toBe(0);
    });

    test('should handle single values', () => {
        expect(calculateTotal('42')).toBe(42);
        expect(calculateTotal('3.14')).toBe(3.14);
        expect(calculateTotal(' 100 ')).toBe(100);
    });

    test('should handle decimal values correctly', () => {
        expect(calculateTotal('0.1,0.2')).toBeCloseTo(0.3);
        expect(calculateTotal('1.99,2.01')).toBe(4);
    });

    test('should ignore empty entries between separators', () => {
        expect(calculateTotal('10,,20')).toBe(30);
        expect(calculateTotal('10\n\n20')).toBe(30);
        expect(calculateTotal(',10,20,')).toBe(30);
    });

    test('should handle large numbers', () => {
        expect(calculateTotal('1000000,2000000')).toBe(3000000);
    });

    test('should handle negative numbers', () => {
        expect(calculateTotal('10,-5,3')).toBe(8);
        expect(calculateTotal('-1,-2,-3')).toBe(-6);
    });

    test('should ignore non-numeric values', () => {
        expect(calculateTotal('abc,10')).toBe(10);
        expect(calculateTotal('10,xyz,20')).toBe(30);
        expect(calculateTotal('invalid')).toBe(0);
        expect(calculateTotal('10,20,hello,30,world')).toBe(60);
    });

    test('should handle mixed valid and invalid values', () => {
        expect(calculateTotal('10, NaN, 20, undefined, 30')).toBe(60);
        expect(calculateTotal('1.5, null, 2.5, , 3.5')).toBe(7.5);
    });

    test('should handle edge cases with special characters', () => {
        expect(calculateTotal('$10, 20€, 30£')).toBe(60); // Only numbers are parsed
        expect(calculateTotal('10.5.5, 20')).toBe(20); // Invalid decimal parsed as NaN and filtered out
    });
});