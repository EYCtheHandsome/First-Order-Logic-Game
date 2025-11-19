// scripts/main.js

import { shuffleArray, getRandomElement } from './utils.js';
import { getTemplatesByDifficulty } from './statementGenerator.js';
import { displayGrid } from './grid.js';

const DEFAULT_PROMPT = 'Pick the statement that matches the grid.';
const NEXT_BUTTON_DEFAULT_TEXT = 'Next Puzzle';

let currentState = {
    grid: null,
    correctStatement: null,
    options: [],
    correctIndex: null,
    value: null,
    difficulty: 'easy', // default
    hint: '',
    puzzleNumber: 0,
    correctCount: 0,
    currentStreak: 0,
    isLocked: false
};

let hintButton = null;
let hintText = null;
let difficultySelect = null;
let nextButton = null;
let puzzleStatEl = null;
let solvedStatEl = null;
let streakStatEl = null;

document.addEventListener('DOMContentLoaded', () => {
    difficultySelect = document.getElementById('difficulty-select');
    nextButton = document.getElementById('next-question');
    hintButton = document.getElementById('hint-button');
    hintText = document.getElementById('hint-text');
    puzzleStatEl = document.getElementById('stat-puzzle');
    solvedStatEl = document.getElementById('stat-correct');
    streakStatEl = document.getElementById('stat-streak');

    resetStats();

    if (difficultySelect) {
        difficultySelect.addEventListener('change', (event) => {
            currentState.difficulty = event.target.value;
            resetStats();
            initializeGame().catch(err => console.error('Failed to reinitialize after difficulty change:', err));
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            initializeGame().catch(err => console.error('Failed to initialize next question:', err));
        });
    }

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

function resetStats() {
    currentState.puzzleNumber = 0;
    currentState.correctCount = 0;
    currentState.currentStreak = 0;
    updateStatsDisplay();
}

function updateStatsDisplay() {
    if (puzzleStatEl) {
        puzzleStatEl.textContent = currentState.puzzleNumber.toString();
    }
    if (solvedStatEl) {
        solvedStatEl.textContent = currentState.correctCount.toString();
    }
    if (streakStatEl) {
        streakStatEl.textContent = currentState.currentStreak.toString();
    }
}

function toggleControlsDuringLoad(isLoading) {
    if (nextButton) {
        nextButton.disabled = isLoading;
        nextButton.textContent = isLoading ? 'Generating...' : NEXT_BUTTON_DEFAULT_TEXT;
    }
    if (difficultySelect) {
        difficultySelect.disabled = isLoading;
    }
}

async function initializeGame() {
    console.log("Initializing game with difficulty:", currentState.difficulty);
    toggleControlsDuringLoad(true);
    currentState.isLocked = true;

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
        currentState.isLocked = false;
        currentState.puzzleNumber += 1;
        updateStatsDisplay();

        console.log("Game initialized successfully.");
    } catch (error) {
        console.error("Error in initializeGame:", error);
        currentState.isLocked = false;
    } finally {
        toggleControlsDuringLoad(false);
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
            // Perfect: this statement does NOT match the current grid -> an incorrect option
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
    if (!optionsContainer) {
        return;
    }
    // Wipe out previous event listeners by cloning
    const newContainer = optionsContainer.cloneNode(false);
    optionsContainer.parentNode.replaceChild(newContainer, optionsContainer);

    options.forEach((option) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'option-button';
        button.dataset.statement = option.naturalLanguageStatement;

        const headline = document.createElement('div');
        headline.className = 'option-headline';
        headline.textContent = option.naturalLanguageStatement;

        const folWrapper = document.createElement('div');
        folWrapper.className = 'fol-pill';

        const folLabel = document.createElement('div');
        folLabel.className = 'fol-label';
        folLabel.textContent = 'FOL';

        const folTextContent = document.createElement('div');
        folTextContent.className = 'fol-text';
        folTextContent.textContent = option.formalFOLStatement || 'No FOL available';

        folWrapper.appendChild(folLabel);
        folWrapper.appendChild(folTextContent);
        button.appendChild(headline);
        button.appendChild(folWrapper);

        button.addEventListener('click', () => evaluateGuess(option.naturalLanguageStatement));
        newContainer.appendChild(button);
    });
}

function evaluateGuess(userGuess) {
    if (currentState.isLocked) {
        return;
    }
    currentState.isLocked = true;
    console.log("User guess:", userGuess);
    const selectedIndex = currentState.options.findIndex(
        (opt) => opt.naturalLanguageStatement === userGuess
    );
    const isCorrect = (selectedIndex === currentState.correctIndex);
    lockOptionButtons(userGuess);
    displayResult(isCorrect);
}

function lockOptionButtons(selectedStatement) {
    const container = document.getElementById('option-buttons');
    if (!container) {
        return;
    }
    const buttons = container.querySelectorAll('.option-button');
    const correctStatement = currentState.correctStatement?.naturalLanguageStatement;

    buttons.forEach((button) => {
        button.disabled = true;
        button.classList.add('option-locked');
        const statement = button.dataset.statement;
        if (statement === correctStatement) {
            button.classList.add('option-correct');
        }
        if (statement === selectedStatement) {
            button.classList.add('option-picked');
            if (statement !== correctStatement) {
                button.classList.add('option-incorrect');
            }
        }
    });
}

function displayResult(isCorrect) {
    if (isCorrect) {
        currentState.correctCount += 1;
        currentState.currentStreak += 1;
    } else {
        currentState.currentStreak = 0;
    }
    updateStatsDisplay();
}
