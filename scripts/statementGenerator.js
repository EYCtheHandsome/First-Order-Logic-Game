// scripts/statementGenerator.js

import { createTemplateFromDefinition } from './templateHandlers.js';

let cachedTemplates = null;

async function loadTemplateDefinitions() {
  if (cachedTemplates) {
    return cachedTemplates;
  }

  const response = await fetch('./scripts/templateBanks/templates.json');
  if (!response.ok) {
    throw new Error(`Failed to load templates.json: ${response.status}`);
  }

  const definitions = await response.json();
  cachedTemplates = Object.fromEntries(
    Object.entries(definitions).map(([difficulty, templateDefs]) => [
      difficulty,
      templateDefs.map((definition) => createTemplateFromDefinition(definition))
    ])
  );

  return cachedTemplates;
}

export async function getTemplatesByDifficulty(difficulty) {
  const templatesByDifficulty = await loadTemplateDefinitions();
  if (!templatesByDifficulty[difficulty]) {
    console.error(`Invalid difficulty level '${difficulty}'; defaulting to easy.`);
    return templatesByDifficulty.easy || [];
  }
  return templatesByDifficulty[difficulty];
}
