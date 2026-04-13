/**
 * @title Two Sum
 * @description Finds two indices in the array such that their values sum up to the target.
 * - **Time Complexity**: $O(n)$ - Single pass through the array.
 * - **Space Complexity**: $O(n)$ - Potential to store all elements in the Hash Map.
 * @param nums - An array of integers.
 * @param target - The integer sum to find.
 * @returns The indices of the two numbers that add up to target (order-independent).
 */
export function twoSum(nums: number[], target: number): number[] {
   const numMap = new Map();
 
   for (let index = 0; index < nums.length; index++) {
      const element = nums[index];
      const complement = target - element; // the number needed to complete the total

      if (numMap.has(complement)) {
         return [numMap.get(complement), index];
      }

      numMap.set(element, index);
   }

   return [];
}