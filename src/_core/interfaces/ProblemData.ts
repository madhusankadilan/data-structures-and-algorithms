import { Examples } from "./Examples";

export interface ProblemData {
   tags: string;
   description: string;
   examples: Examples[];
   constraints: string[];
   followUps?: string[];
}