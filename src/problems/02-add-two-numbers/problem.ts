import { ProblemData } from "../../_core";

export const data: ProblemData = {
   tags: "Medium | Algorithms",
   description: `You are given two <strong>non-empty</strong> linked lists representing two non-negative integers. 
   The digits are stored in <strong>reverse order</strong>, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.</br></br>
   You may assume the two numbers do not contain any leading zero, except the number 0 itself.`,
   examples: [
      {
         input: "l1 = [2,4,3], l2 = [5,6,4]",
         output: "[7,0,8]",
         explanation: "342 + 465 = 807."
      },
      {
         input: "l1 = [0], l2 = [0]",
         output: "[0]"
      },
      {
         input: "l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]",
         output: "[8,9,9,9,0,0,0,1]"
      }
   ],
   constraints: [
      "The number of nodes in each linked list is in the range [1, 100].",
      "0 <= Node.val <= 9",
      "It is guaranteed that the list represents a number that does not have leading zeros."
   ]
};