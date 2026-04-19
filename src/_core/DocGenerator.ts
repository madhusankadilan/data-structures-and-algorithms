import path from 'node:path';
import fs from 'node:fs';
import Handlebars from "handlebars";
import puppeteer, { Browser } from 'puppeteer';
import TurndownService from 'turndown';
import { PROBLEM_FILE, ROOT_DIR } from './constants';
import { htmlTemplate } from "./html-templates";

export class DocGenerator {

   private root: string;
   private browser!: Browser;
   private turndownService = new TurndownService();

   constructor() {
      this.root = ROOT_DIR;
   }

   async generateDocs() {
      await this.init();

      const problemsRoot = path.join(__dirname, `../${this.root}`);
      const folders = fs.readdirSync(problemsRoot); // Sync because below code depend on the output of this

      for (const folder of folders) {
         const folderPath = path.join(problemsRoot, folder);
         const isDirectory = fs.lstatSync(folderPath).isDirectory(); // Sync because below code depend on the output of this

         if (!isDirectory) {
            continue;
         }

         const problemFilePath = path.join(folderPath, PROBLEM_FILE);
         const isProblemFileExists = fs.existsSync(problemFilePath); // Sync because below code depend on the output of this

         if (!isProblemFileExists) {
            continue;
         }

         console.log(`📦  [PROCESSING] ${folder}`);

         try {
            const { data } = await import(problemFilePath);
            const title = this.formatTitle(folder);
            const templateData = { ...data, title };

            // TODO: Can we move to a separate function and call this when init?
            Handlebars.registerHelper('addOne', (value) => parseInt(value) + 1);
            const template = Handlebars.compile(htmlTemplate);
            const finalHtml = template(templateData);

            // Generate PDF File
            await this.generatePdfFile(finalHtml, folderPath);
            console.log(`    ├── 📄 problem.pdf: Generated successfully`);

            // Generate MarkDown file
            await this.generateMarkDownFile(finalHtml, folderPath);
            console.log(`    └── 📝 problem.md:  Generated successfully`);
         } catch (error: any) {
            console.log(`    └── ❌ Error in ${folder}: ${error.message}`);
         }
      }
   }

   private async init() {
      this.browser = await puppeteer.launch();
      this.turndownService.remove('style');
   }

   private async generatePdfFile(finalHtml: string, folderPath: string) {
      const page = await this.browser.newPage();
      await page.setContent(finalHtml);
      await page.pdf({ path: path.join(folderPath, 'problem.pdf'), format: 'A4', printBackground: true });
      await this.browser.close();
   }

   private generateMarkDownFile(finalHtml: string, folderPath: string) {
      const markdown = this.turndownService.turndown(finalHtml);
      fs.writeFileSync(path.join(folderPath, 'problem.md'), markdown);
   }

   private formatTitle(folderName: string): string {
      return folderName
         .replace(/^0+/, '') // Remove leading zeros
         .replace(/-/g, ' ') // Replace dashes with spaces
         .replace(/\b\w/g, (l) => l.toUpperCase()) // Capitalize words
         .replace(/^(\d+)\s/, '$1. '); // Add dot after the leading number
   }
}