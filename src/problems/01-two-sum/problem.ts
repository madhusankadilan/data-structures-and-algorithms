import { ProblemData } from "../../_core";

export const data: ProblemData = {
   tags: "Easy | Algorithms",
   description: `Given an array of integers  <code>nums</code>  and an integer  <code>target</code> , return <em>indices</em> of the two
numbers such that they add up to target.</br></br>
You may assume that each input would have <strong>exactly one solution</strong>, and you may not
use the same element twice.</br></br>
You can return the answer in any order.`,
   examples: [
      {
         input: "nums = [2,7,11,15], target = 9",
         output: "[0,1]",
         explanation: "Because  nums[0] + nums[1] == 9 , we return  [0, 1] ."
      },
      {
         input: "nums = [3,2,4], target = 6",
         output: "[1,2]"
      },
      {
         input: "nums = [3,3], target = 6",
         output: "[0,1]"
      }
   ],
   constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists."
   ],
   followUps: [
      "Can you come up with an algorithm that is less than O(n²) time complexity?"
   ]
};