# First Order Logic Game
A logic puzzle game that generates 5×5 grids of shapes, colors, and numbers and challenges players to select the statement that matches the grid. 

## Features

- **Dynamic Puzzle Generation** – Randomized 5×5 grid per round with vibrant, rounded candy pieces.
- **Three Difficulties** – Easy, Medium, and Hard logic templates stored as JSON rules.
- **Statement + Hint System** – Neutral prompt area with an optional hint button that reveals a clue.
- **Extensible Templates** – Add new rules by appending entries to `scripts/templateBanks/templates.json`.

## Project Structure

```
First Order Logic Game/
├── index.html
├── css/
│   └── style.css
├── scripts/
│   ├── main.js
│   ├── grid.js
│   ├── utils.js
│   ├── statementGenerator.js
│   ├── templateHandlers.js
│   └── templateBanks/
│       └── templates.json
└── README.md
```

### Key scripts

- `scripts/main.js` – Orchestrates gameplay, hint interaction, and option rendering.
- `scripts/templateHandlers.js` – Generic rule engine building templates from JSON definitions.
- `scripts/templateBanks/templates.json` – All puzzle definitions (statements, hints, rules for each difficulty).
- `scripts/utils.js` – Utility helpers (colors, shapes, randomization, etc.).
- `scripts/grid.js` – Renders the SVG shapes with candy styling.

## Getting Started

1. **Clone / download** this repository (or your fork).
2. **Serve the files** via a local web server so `fetch()` can load `templates.json`. Examples:
   ```bash
   npx serve
   # or
   python3 -m http.server 8080
   ```
3. Visit the served URL (e.g., http://localhost:8080) and play.

## Gameplay Flow

1. Choose a difficulty from the dropdown.
2. The game picks a template for that difficulty, generates the grid, and displays neutral instructions.
3. Click **Show Hint** to reveal a clue (optional).
4. Review the four statements (one true, three false) and click your answer.
5. Use **Next Puzzle** to play again with a new template.

## Extending Templates

1. Open `scripts/templateBanks/templates.json`.
2. Duplicate an existing template entry or create a new one.
3. Refresh the browser to see new templates in rotation.

## License

MIT

