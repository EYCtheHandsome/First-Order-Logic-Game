// scripts/main.js

import { shuffleArray, getRandomElement } from './utils.js';
import { getTemplatesByDifficulty } from './statementGenerator.js';
import { displayGrid } from './grid.js';

const DEFAULT_PROMPT = 'Pick the statement that matches the grid.';

let currentState = {
    grid: null,
    correctStatement: null,
    options: [],
    correctIndex: null,
    value: null,
    difficulty: 'easy', // default
    hint: ''
};

let statementArea = null;
let hintButton = null;
let hintText = null;

document.addEventListener('DOMContentLoaded', () => {
    const difficultySelect = document.getElementById('difficulty-select');
    statementArea = document.getElementById('statement-text');
    hintButton = document.getElementById('hint-button');
    hintText = document.getElementById('hint-text');
    if (statementArea) {
        statementArea.textContent = DEFAULT_PROMPT;
    }

    // Difficulty changed → re-initialize game
    difficultySelect.addEventListener('change', (event) => {
        currentState.difficulty = event.target.value;
        initializeGame().catch(err => console.error('Failed to reinitialize after difficulty change:', err));
    });

    // Next question button
    document.getElementById('next-question').addEventListener('click', () => {
        initializeGame().catch(err => console.error('Failed to initialize next question:', err));
    });

    if (hintButton) {
        hintButton.addEventListener('click', () => {
            if (!hintText || !currentState.hint) {
                return;
            }
            const isHidden = hintText.hasAttribute('hidden');
            if (isHidden) {
                hintText.textContent = currentState.hint;
                hintText.hidden = false;
                hintButton.textContent = 'Hide Hint';
            } else {
                hintText.hidden = true;
                hintText.textContent = '';
                hintButton.textContent = 'Show Hint';
            }
        });
    }

    // Init on load
    initializeGame().catch(err => console.error('Failed to initialize game:', err));
});

async function initializeGame() {
    console.log("Initializing game with difficulty:", currentState.difficulty);

    try {
        // 1. Grab all templates for the difficulty
        const templateBank = await getTemplatesByDifficulty(currentState.difficulty);
        if (!templateBank || templateBank.length === 0) {
            throw new Error("No templates found for this difficulty.");
        }

        // 2. Pick one random template as the "correct" template
        const correctTemplate = getRandomElement(templateBank);

        // 3. Generate statement (NL + FOL + details + hint)
        const statementData = correctTemplate.generateStatements();
        console.log("Correct statement data:", statementData);

        // 4. Generate a grid that satisfies the correct statement
        const gridResult = correctTemplate.generateGrid(true, statementData.details);
        console.log("Generated grid:", gridResult);

        currentState.grid = gridResult.grid;
        currentState.correctStatement = {
            naturalLanguageStatement: statementData.naturalLanguageStatement,
            formalFOLStatement: statementData.formalFOLStatement,
            details: statementData.details,
            hint: statementData.hint || ''
        };
        currentState.value = gridResult.satisfies; // or any extra data you want
        currentState.hint = statementData.hint || '';

        // 5. Build some incorrect statements
        const incorrectOptions = generateIncorrectStatements(templateBank, correctTemplate);

        // 6. Combine correct + incorrect, remove duplicates, shuffle
        currentState.options = [currentState.correctStatement, ...incorrectOptions];
        const uniqueOptions = Array.from(new Set(currentState.options.map(o => o.naturalLanguageStatement)))
            .map(nl => currentState.options.find(o => o.naturalLanguageStatement === nl));
        currentState.options = uniqueOptions;

        shuffleArray(currentState.options);
        currentState.correctIndex = currentState.options.findIndex(
            (opt) => opt.naturalLanguageStatement === currentState.correctStatement.naturalLanguageStatement
        );

        // 7. Display the grid + options + statement
        displayGrid(currentState.grid);
        if (statementArea) {
            statementArea.textContent = DEFAULT_PROMPT;
        }
        if (hintText) {
            hintText.hidden = true;
            hintText.textContent = '';
        }
        if (hintButton) {
            hintButton.textContent = 'Show Hint';
            hintButton.disabled = !currentState.hint;
            hintButton.title = currentState.hint ? 'Reveal a hint' : 'No hint available';
        }
        displayOptions(currentState.options);

        console.log("Game initialized successfully.");
    } catch (error) {
        console.error("Error in initializeGame:", error);
        alert("An error occurred. Check console for details.");
    }
}

function generateIncorrectStatements(templateBank, correctTemplate) {
    const incorrectStatements = [];
    const usedTemplates = new Set([correctTemplate]);

    // We'll attempt to gather 3 unique incorrect statements
    while (incorrectStatements.length < 3) {
        const randomTemplate = getRandomElement(templateBank);
        if (usedTemplates.has(randomTemplate)) {
            // Already used (or is the correct one)
            continue;
        }

        // Generate the statement
        const statementData = randomTemplate.generateStatements();
        // Check if it is satisfied by the *correct* grid
        const isSatisfied = randomTemplate.verifyStatementWithGrid(currentState.grid, statementData.details);

        if (!isSatisfied) {
            // Perfect: this statement does NOT match the current grid → an incorrect option
            incorrectStatements.push({
                naturalLanguageStatement: statementData.naturalLanguageStatement,
                formalFOLStatement: statementData.formalFOLStatement,
                details: statementData.details
            });
            usedTemplates.add(randomTemplate);
        } else {
            console.log("Skipping statement that also satisfies the grid:", statementData.naturalLanguageStatement);
        }
    }
    return incorrectStatements;
}

function displayOptions(options) {
    const optionsContainer = document.getElementById('option-buttons');
    // Wipe out previous event listeners by cloning
    const newContainer = optionsContainer.cloneNode(false);
    optionsContainer.parentNode.replaceChild(newContainer, optionsContainer);

    options.forEach((option) => {
        const button = document.createElement('button');
        button.className = 'option-button';

        button.innerHTML = `
      <div>${option.naturalLanguageStatement}</div>
      <br/>
      <div class="fol-text" style="font-size: smaller;">
        FOL: ${option.formalFOLStatement || 'No FOL available'}
      </div>
    `;
        button.addEventListener('click', () => evaluateGuess(option.naturalLanguageStatement));
        newContainer.appendChild(button);
    });
}

function evaluateGuess(userGuess) {
    console.log("User guess:", userGuess);
    const selectedIndex = currentState.options.findIndex(
        (opt) => opt.naturalLanguageStatement === userGuess
    );
    const isCorrect = (selectedIndex === currentState.correctIndex);
    displayResult(isCorrect);
}

function displayResult(isCorrect) {
    const message = isCorrect
        ? "Correct! Well done."
        : "Incorrect! Better luck next time.";
    alert(message);
}
