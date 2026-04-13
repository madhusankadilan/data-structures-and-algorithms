import { describe, expect, it, test } from "vitest";
import { twoSum } from "./two-sum";

describe("two sum - basic functionality (the happy path)", () => {
   it("handles a standard positive integer array", () => {
      // Use .sort() since the problem allows any order, and to ensure the order matches [0, 1]
      expect(twoSum([2, 7, 11, 15], 9).sort()).toEqual([0, 1]);
   });

   it("handles unsorted array with adjacent indices", () => {
      expect(twoSum([3, 2, 4], 6).sort()).toEqual([1, 2]);
   });

   it("handles unsorted array with non-adjacent indices", () => {
      expect(twoSum([10, 2, 8, 4], 6).sort()).toEqual([1, 3]);
   });

   it("handles duplicate values at different indices", () => {
      expect(twoSum([3, 3], 6).sort()).toEqual([0, 1]);
   });

   it("handles indices at the array boundaries", () => {
      expect(twoSum([1, 5, 2, 4, 9], 10).sort()).toEqual([0, 4]);
   });
});

describe("Two Sum - Numerical Edge Cases", () => {
   it("handles negative integers", () => {
      expect(twoSum([-1, -2, -3, -4], -7).sort()).toEqual([2, 3]);
   });

   it("handles mixed positive and negative numbers", () => {
      expect(twoSum([-10, 7, 19, 15], 5).sort()).toEqual([0, 3]);
   });

   it("handles zero values and a zero target", () => {
      expect(twoSum([0, 4, 3, 0], 0).sort()).toEqual([0, 3]);
   });

   it("handles large integers at the constraint limit", () => {
      // 1e9 is 1,000,000,000 (one billion).
      const limit = 1e9;
      expect(twoSum([limit, 500, -limit], 0).sort()).toEqual([0, 2]);
   });
});

describe("Two Sum - Invalid/Edge Cases", () => {
   it("returns empty array when no solution exists", () => {
      // Ensuring it doesn't return [0, 0] or crash
      expect(twoSum([1, 2, 3], 7).sort()).toEqual([]);
   });

   it('should not use the same element twice even if it is half the target', () => {
      // It should actually pick [1, 2] if 2+4=6
      expect(twoSum([3, 2, 4], 6)).not.toEqual([0, 0]);
   });

   test('should handle arrays smaller than the minimum constraint', () => {
      expect(twoSum([1], 2)).toEqual([]);
   });
});

describe("Two Sum - Time Complexity Test (O(n))", () => {
   it("performs efficiently with 100,000 elements (Linear Time)", () => {
      const size = 100_000; // Numeric Separator. purely for human readability.
      const nums = Array.from({ length: size }, (_, i) => i);
      const target = size + size - 3; // Solution is the last two elements

      const start = performance.now();
      const result = twoSum(nums, target);
      const end = performance.now();

      expect(result.sort()).toEqual([size - 2, size - 1]);
      expect(end - start).toBeLessThan(50); // Should finish in < 50ms
   });
});