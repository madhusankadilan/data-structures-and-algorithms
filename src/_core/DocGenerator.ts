import path from 'node:path';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import Handlebars from "handlebars";
import puppeteer, { Browser } from 'puppeteer';
import TurndownService from 'turndown';
import { PROBLEM_FILE, ROOT_DIR } from './constants';
import { htmlTemplate } from "./html-template";

export class DocGenerator {

   private readonly rootDir: string;
   private readonly turndownService: TurndownService;
   private readonly compiledTemplate: HandlebarsTemplateDelegate;
   private browser: Browser | null = null;

   constructor() {
      this.rootDir = path.join(__dirname, '..', ROOT_DIR);
      this.turndownService = this.createTurndownService();
      this.compiledTemplate = this.createTemplate();
   }

   async generateDocs() {
      const folders = await this.resolveProblemFolders();

      if (!folders.length) {
         console.log(`\n\x1b[41m\x1b[37m\x1b[1m FATAL \x1b[0m \x1b[31mNo problem folders found.\x1b[0m`);
         return;
      }

      await this.withBrowser(async () => {
         await Promise.all(folders.map(folder => this.processFolder(folder)));
      })
   }

   private async processFolder(folderPath: string): Promise<void> {
      const folderName = path.basename(folderPath);

      console.log(`\x1b[44m\x1b[37m\x1b[1m RUN  \x1b[0m \x1b[34m[Processing]:\x1b[0m \x1b[1m${folderName}\x1b[0m`);

      try {
         const problemFilePath = path.join(folderPath, PROBLEM_FILE);
         const { data } = await import(problemFilePath);

         const html = this.compiledTemplate({
            ...data,
            title: this.formatTitle(folderName)
         });

         await Promise.all([
            this.generatePdf(html, folderPath),
            this.generateMarkdown(html, folderPath)
         ])
      } catch (error) {
         const msg = error instanceof Error ? error.message : String(error);
         console.error(`      \x1b[90m└──\x1b[0m \x1b[41m\x1b[37m ERROR \x1b[0m \x1b[31m${folderName}:\x1b[0m ${msg}`);
      }
   }

   private async generatePdf(html: string, folderPath: string): Promise<void> {
      if (!this.browser) {
         throw new Error('Browser is not initialized.');
      }

      const page = await this.browser.newPage();
      const folderName = path.basename(folderPath);

      try {
         await page.setContent(html);
         await page.pdf({
            path: path.join(folderPath, 'problem.pdf'),
            format: 'A4',
            printBackground: true
         });

         console.log(`      \x1b[90m├──\x1b[0m \x1b[42m\x1b[30m DONE \x1b[0m \x1b[90m${folderName}/problem.pdf:\x1b[0m \x1b[32mGenerated successfully\x1b[0m`);
      } catch (error) {
         console.log(`      \x1b[90m├──\x1b[0m \x1b[41m\x1b[37m FAIL \x1b[0m \x1b[90m${folderName}/problem.pdf:\x1b[0m \x1b[31mGeneration failed\x1b[0m`);
         throw error;
      } finally {
         await page.close();
      }
   }

   private async generateMarkdown(html: string, folderPath: string): Promise<void> {
      const folderName = path.basename(folderPath);

      try {
         const markdown = this.turndownService.turndown(html);
         await fsPromises.writeFile(path.join(folderPath, 'problem.md'), markdown, 'utf-8');
         console.log(`      \x1b[90m└──\x1b[0m \x1b[42m\x1b[30m DONE \x1b[0m \x1b[90m${folderName}/problem.md:\x1b[0m \x1b[32mGenerated successfully\x1b[0m`);
      } catch (error) {
         console.log(`      \x1b[90m└──\x1b[0m \x1b[41m\x1b[37m FAIL \x1b[0m \x1b[90m${folderName}/problem.md:\x1b[0m \x1b[31mGeneration failed\x1b[0m`);
         throw error;
      }
   }

   private async resolveProblemFolders(): Promise<string[]> {
      const entries = await fsPromises.readdir(this.rootDir, { withFileTypes: true });

      const folderPaths = entries
         .filter(entry => entry.isDirectory())
         .map(entry => path.join(entry.parentPath, entry.name));

      const results = await Promise.all(
         folderPaths.map(async (folderPath) => {
            const problemFile = path.join(folderPath, PROBLEM_FILE);

            try {
               // Check if current user can read the file
               await fsPromises.access(problemFile, fs.constants.R_OK);
               return folderPath;
            } catch (error) {
               const code = (error as NodeJS.ErrnoException).code;
               console.log(`\x1b[43m\x1b[30m\x1b[1m SKIP \x1b[0m \x1b[33m[Skipped]:\x1b[0m \x1b[1m${folderPath}\x1b[0m`);
               console.log(`        \x1b[90mReason: ${code === 'ENOENT' ? 'File not found' : 'Permission denied'}\x1b[0m\n`);
               return null;
            }
         })
      );

      return results.filter(Boolean) as string[];
   }

   private async withBrowser(fn: () => Promise<void>): Promise<void> {
      this.browser = await puppeteer.launch();

      try {
         await fn();
      } catch (error) {
         const msg = error instanceof Error ? error.message : String(error);
         console.log(`\n\x1b[41m\x1b[37m\x1b[1m ERROR \x1b[0m \x1b[31m${msg}.\x1b[0m`);
      } finally {
         await this.browser.close();
         this.browser = null;
      }
   }

   private createTurndownService() {
      const turndownService = new TurndownService();
      turndownService.remove('style');
      return turndownService;
   }

   private createTemplate() {
      Handlebars.registerHelper('addOne', (value: unknown) => Number(value) + 1);
      const template = Handlebars.compile(htmlTemplate);
      return template;
   }

   private formatTitle(folderName: string): string {
      return folderName
         .replace(/^0+/, '') // Remove leading zeros
         .replace(/-/g, ' ') // Replace dashes with spaces
         .replace(/\b\w/g, (c) => c.toUpperCase()) // Capitalize words
         .replace(/^(\d+)\s/, '$1. '); // Add dot after the leading number
   }

}