export const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <style>
        @page { size: A4; margin: 20mm; }

        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
        }
        .header { 
            border-bottom: 2px solid #eee; 
            padding-bottom: 10px; 
            margin-bottom: 20px; 
        }
        h1 { 
            color: #2c3e50; 
            margin: 0; 
            font-size: 22pt; 
        }
        .tags { 
            color: #7f8c8d; 
            font-size: 10pt; 
            font-weight: bold; 
            margin-top: 5px; 
        }
        
        /* The Blue Sidebar Style */
        .section-title { 
            font-size: 14pt; 
            color: #2980b9; 
            margin-top: 25px; 
            margin-bottom: 10px; 
            border-left: 5px solid #2980b9; 
            padding-left: 10px; 
        }
        
        /* The Gray Example Box Style */
        .example-box { 
            background-color: #f8f9fa; 
            border: 1px solid #e9ecef; 
            border-radius: 5px; 
            padding: 15px; 
            margin-bottom: 15px; 
        }
        
        code { 
            background-color: #eee; 
            padding: 2px 4px; 
            border-radius: 3px; 
            font-family: 'Courier New', monospace; 
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{title}}</h1>
        <div class="tags">{{tags}}</div>
    </div>

    <div>{{{description}}}</div>

    <div class="section-title">Examples</div>

    {{#each examples}}
    <div class="example-box">
        <strong>Example {{addOne @index}}:</strong><br>
        <code>Input: {{this.input}}</code><br>
        <code>Output: {{this.output}}</code>
        {{#if this.explanation}}<br><em>Explanation: {{this.explanation}}</em>{{/if}}
    </div>
    {{/each}}

    <div class="section-title">Constraints</div>

    <ul>
        {{#each constraints}}<li>{{this}}</li>{{/each}}
    </ul>

    {{#if followUps}}
    <div class="section-title">Follow-ups</div>

    <ul>
        {{#each followUps}}<li>{{this}}</li>{{/each}}
    </ul>
    {{/if}}
</body>
</html>
`;