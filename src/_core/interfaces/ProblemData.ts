import { Examples } from "./Examples";

export interface ProblemData {
   title: string;
   tags: string;
   description: string;
   examples: Examples[];
   constraints: string[];
   followUps?: string[];
}