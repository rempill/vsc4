Build a simple, single-page mock web app (HTML + CSS + vanilla JS or minimal React) to demonstrate a VS Code C4 diagram editor prototype. 

Keep everything 100% hardcoded and dead simple.

### UI Layout
1. Top Bar:
   - A text box: "Describe your architecture (e.g., 'E-commerce store with Stripe payment')..."
   - A "Generate Diagram" button.
   - 2 clickable sample tags: "E-Commerce System" and "User Auth Flow".

2. Split Screen View:
   - Left Panel ("Mermaid C4 Code"): A dark-mode code box showing hardcoded Mermaid C4 text.
   - Right Panel ("Visual Preview"): A clean mock diagram showing 3-4 styled C4 boxes (Person, System, Database) connected with lines/arrows (use simple SVG or styled CSS divs).

### Behavior (Hardcoded only)
- Clicking "Generate" or clicking a sample tag just switches between 2 hardcoded states:
  - State 1 (E-Commerce):
    - Left shows hardcoded C4 code for Store + Database + Stripe.
    - Right displays the mock diagram cards for Customer -> Store App -> Stripe / DB.
  - State 2 (Auth Flow):
    - Left shows hardcoded C4 code for User + API Gateway + Auth Service.
    - Right displays mock diagram cards for User -> Gateway -> Auth Service.
- No external diagram libraries, no real parsers, no backend. Just a clean dark-theme mock (VS Code style).