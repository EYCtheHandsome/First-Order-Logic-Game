// scripts/templateHandlers.js
// Generic rule engine that materializes templates purely from JSON definitions.

import {
  getRandomElement,
  randomIntFromInterval,
  getColorName,
  shapes,
  colors,
  numbers,
  gridSize
} from './utils.js';

function fillTemplate(template, details) {
  return template.replace(/\{([^}]+)\}/g, (_, key) => {
    const value = details[key];
    return value !== undefined ? value : `{${key}}`;
  });
}

function createRandomGrid() {
  return Array.from({ length: gridSize * gridSize }, (_, idx) => ({
    shape: getRandomElement(shapes),
    color: getRandomElement(colors),
    number: getRandomElement(numbers),
    position: {
      row: Math.floor(idx / gridSize),
      col: idx % gridSize
    }
  }));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getDomain(property) {
  switch (property) {
    case 'shape':
      return shapes;
    case 'color':
      return colors;
    case 'number':
      return numbers;
    default:
      throw new Error(`Unknown property domain requested for ${property}`);
  }
}

function pickDistinct(property, excludeValue) {
  const domain = getDomain(property).filter((value) => value !== excludeValue);
  return getRandomElement(domain.length ? domain : getDomain(property));
}

function ensureBounds(min, max) {
  const floor = Math.min(...numbers);
  const ceiling = Math.max(...numbers);
  return [clamp(min, floor, ceiling), clamp(max, floor, ceiling)];
}

const valueResolvers = {
  placeholder: ({ key }, context) => context.details[key],
  placeholderName: ({ key }, context) => context.details[key],
  cellProperty: ({ property }, context) => context.cell?.[property],
  neighborProperty: ({ property }, context) => context.neighbor?.[property],
  constant: ({ value }) => value,
  number: ({ value }) => value
};

function resolveValue(ref, context) {
  if (!ref) return undefined;
  const resolver = valueResolvers[ref.kind];
  if (!resolver) {
    throw new Error(`Unsupported value ref kind: ${ref.kind}`);
  }
  return resolver(ref, context);
}

function evaluateCondition(condition, context) {
  if (!condition) {
    return true;
  }

  const op = condition.operator;
  switch (op) {
    case 'all':
      return condition.conditions.every((c) => evaluateCondition(c, context));
    case 'any':
      return condition.conditions.some((c) => evaluateCondition(c, context));
    case 'not':
      return !evaluateCondition(condition.condition, context);
    case 'equals': {
      const left = resolveValue(condition.left, context);
      const right = resolveValue(condition.right, context);
      return left === right;
    }
    case 'notEquals': {
      const left = resolveValue(condition.left, context);
      const right = resolveValue(condition.right, context);
      return left !== right;
    }
    case 'greaterThan': {
      const left = resolveValue(condition.left, context);
      const right = resolveValue(condition.right, context);
      return left > right;
    }
    case 'lessThan': {
      const left = resolveValue(condition.left, context);
      const right = resolveValue(condition.right, context);
      return left < right;
    }
    case 'greaterOrEqual': {
      const left = resolveValue(condition.left, context);
      const right = resolveValue(condition.right, context);
      return left >= right;
    }
    case 'lessOrEqual': {
      const left = resolveValue(condition.left, context);
      const right = resolveValue(condition.right, context);
      return left <= right;
    }
    case 'between': {
      const value = resolveValue(condition.value, context);
      const min = resolveValue(condition.min, context);
      const max = resolveValue(condition.max, context);
      return value >= min && value <= max;
    }
    case 'parity': {
      const value = resolveValue(condition.value, context);
      const parity = resolveValue(condition.parity, context);
      return parity === 'even' ? value % 2 === 0 : value % 2 !== 0;
    }
    case 'prime': {
      const value = resolveValue(condition.value, context);
      if (value < 2) return false;
      if (value === 2) return true;
      if (value % 2 === 0) return false;
      for (let i = 3; i <= Math.sqrt(value); i += 2) {
        if (value % i === 0) {
          return false;
        }
      }
      return true;
    }
    case 'multipleOf': {
      const value = resolveValue(condition.value, context);
      const factor = resolveValue(condition.factor, context);
      return value % factor === 0;
    }
    case 'inRegion': {
      const cell = context.cell;
      if (!cell) return false;
      const direction = resolveValue(condition.direction, context);
      const size = resolveValue(condition.size, context);
      return isInRegion(cell, direction, size);
    }
    default:
      throw new Error(`Unsupported condition operator: ${op}`);
  }
}

function isInRegion(cell, direction, numUnits) {
  switch (direction) {
    case 'left':
      return cell.position.col < numUnits;
    case 'right':
      return cell.position.col >= (gridSize - numUnits);
    case 'top':
      return cell.position.row < numUnits;
    case 'bottom':
      return cell.position.row >= (gridSize - numUnits);
    default:
      return false;
  }
}

function applyCellAction(action, cell, details) {
  switch (action.action) {
    case 'setCellProperty': {
      const value = resolveValue(action.value, { cell, details });
      cell[action.property] = value;
      return { status: 'applied' };
    }
    case 'setCellPropertyDistinct': {
      const exclude = details[action.fromPlaceholder];
      cell[action.property] = pickDistinct(action.property, exclude);
      return { status: 'applied' };
    }
    case 'requireRegion': {
      const direction = resolveValue(action.direction, { cell, details });
      const size = resolveValue(action.size, { cell, details });
      if (isInRegion(cell, direction, size)) {
        return { status: 'applied' };
      }
      return { status: 'needsBreak' };
    }
    default:
      throw new Error(`Unsupported cell action: ${action.action}`);
  }
}

function getValueMeetingComparison(comparison, threshold) {
  switch (comparison) {
    case 'greaterThan':
      return clamp(threshold + 1, Math.min(...numbers), Math.max(...numbers));
    case 'greaterOrEqual':
      return clamp(threshold, Math.min(...numbers), Math.max(...numbers));
    case 'lessThan':
      return clamp(threshold - 1, Math.min(...numbers), Math.max(...numbers));
    case 'lessOrEqual':
      return clamp(threshold, Math.min(...numbers), Math.max(...numbers));
    default:
      return threshold;
  }
}

function getValueBreakingComparison(comparison, threshold) {
  switch (comparison) {
    case 'greaterThan':
      return clamp(threshold, Math.min(...numbers), Math.max(...numbers));
    case 'greaterOrEqual':
      return clamp(threshold - 1, Math.min(...numbers), Math.max(...numbers));
    case 'lessThan':
      return clamp(threshold + 1, Math.min(...numbers), Math.max(...numbers));
    case 'lessOrEqual':
      return clamp(threshold + 1, Math.min(...numbers), Math.max(...numbers));
    default:
      return threshold;
  }
}

function ensureNeighbor(action, neighbor, details) {
  switch (action.action) {
    case 'setNeighborProperty': {
      const value = resolveValue(action.value, { neighbor, details });
      neighbor[action.property] = value;
      return;
    }
    case 'setNeighborPropertyDistinct': {
      const exclude = details[action.fromPlaceholder];
      neighbor[action.property] = pickDistinct(action.property, exclude);
      return;
    }
    case 'ensureNeighborNumber': {
      const threshold = details[action.placeholder];
      neighbor.number = getValueMeetingComparison(action.comparison, threshold);
      return;
    }
    case 'setNeighborNumberBreaking': {
      const threshold = details[action.placeholder];
      neighbor.number = getValueBreakingComparison(action.comparison, threshold);
      return;
    }
    default:
      throw new Error(`Unsupported neighbor action: ${action.action}`);
  }
}

function getNeighborPositions(cell, direction) {
  const { row, col } = cell.position;
  switch (direction) {
    case 'right':
      return [{ row, col: col + 1 }];
    case 'left':
      return [{ row, col: col - 1 }];
    case 'above':
      return [{ row: row - 1, col }];
    case 'below':
      return [{ row: row + 1, col }];
    case 'topLeft':
      return [{ row: row - 1, col: col - 1 }];
    case 'topRight':
      return [{ row: row - 1, col: col + 1 }];
    default:
      return [];
  }
}

function getNeighborCells(grid, cell, direction) {
  const positions = getNeighborPositions(cell, direction);
  return positions
    .map((pos) =>
      grid.find((candidate) => candidate.position.row === pos.row && candidate.position.col === pos.col)
    )
    .filter(Boolean);
}

function generateDetails(definition) {
  const { placeholders = {}, computedFields = [] } = definition;
  const details = {};

  for (const [key, def] of Object.entries(placeholders)) {
    const generatorType = def.type;
    switch (generatorType) {
      case 'shape':
        const excludedShapeKeys = def.excludePlaceholders || [];
        const excludedShapes = excludedShapeKeys
          .map((placeholderKey) => details[placeholderKey])
          .filter(Boolean);
        {
          const domain = shapes.filter((shape) => !excludedShapes.includes(shape));
          details[key] = getRandomElement(domain.length ? domain : shapes);
        }
        break;
      case 'color':
        const excludedColorKeys = def.excludePlaceholders || [];
        const excludedColors = excludedColorKeys
          .map((placeholderKey) => details[placeholderKey])
          .filter(Boolean);
        {
          const domain = colors.filter((color) => !excludedColors.includes(color));
          details[key] = getRandomElement(domain.length ? domain : colors);
        }
        break;
      case 'number': {
        let min = def.min ?? Math.min(...numbers);
        let max = def.max ?? Math.max(...numbers);
        if (def.minRef) {
          min = details[def.minRef] + (def.minOffset ?? 0);
        }
        if (def.maxRef) {
          max = details[def.maxRef] + (def.maxOffset ?? 0);
        }
        [min, max] = ensureBounds(min, max);
        details[key] = randomIntFromInterval(min, max);
        break;
      }
      case 'int': {
        let min = def.min ?? 0;
        let max = def.max ?? gridSize;
        if (def.minRef) {
          min = details[def.minRef] + (def.minOffset ?? 0);
        }
        if (def.maxRef) {
          max = details[def.maxRef] + (def.maxOffset ?? 0);
        }
        if (min > max) {
          [min, max] = [max, min];
        }
        details[key] = randomIntFromInterval(min, max);
        break;
      }
      case 'choice':
        details[key] = getRandomElement(def.options);
        break;
      case 'comparison':
        details[key] = getRandomElement(def.options || ['greater', 'less']);
        break;
      case 'parity':
        details[key] = getRandomElement(['even', 'odd']);
        break;
      case 'factor':
        details[key] = getRandomElement(def.options || [2, 3]);
        break;
      default:
        throw new Error(`Unsupported placeholder type: ${generatorType}`);
    }
  }

  computedFields.forEach((field) => {
    switch (field.type) {
      case 'colorName':
        details[field.key] = getColorName(details[field.source]);
        break;
      case 'regionDescription': {
        const direction = details[field.directionKey];
        const numUnits = details[field.sizeKey];
        const dimension = direction === 'left' || direction === 'right' ? 'columns' : 'rows';
        details[field.key] = `${direction} ${numUnits} ${dimension}`;
        break;
      }
      case 'comparisonWord': {
        const value = details[field.source];
        details[field.key] = value === 'greater' ? 'greater than' : 'less than';
        break;
      }
      case 'comparisonSymbol': {
        const value = details[field.source];
        details[field.key] = value === 'greater' ? '>' : '<';
        break;
      }
      case 'parityPredicate': {
        const value = details[field.source];
        details[field.key] = value === 'even' ? 'Even' : 'Odd';
        break;
      }
      case 'stringTemplate':
        details[field.key] = fillTemplate(field.template, details);
        break;
      default:
        throw new Error(`Unsupported computed field: ${field.type}`);
    }
  });

  return details;
}

function applyBreakAntecedent(rule, cell, details) {
  if (!rule.breakAntecedent) {
    return;
  }
  applyCellAction(rule.breakAntecedent, cell, details);
}

function ensureCellSatisfiesCondition(condition, cell, details) {
  if (!condition) return;
  const op = condition.operator;
  switch (op) {
    case 'all':
      condition.conditions.forEach((c) => ensureCellSatisfiesCondition(c, cell, details));
      break;
    case 'any':
      if (condition.conditions && condition.conditions.length > 0) {
        const preferred = condition.conditions.find((c) =>
          evaluateCondition(c, { cell, details })
        );
        ensureCellSatisfiesCondition(preferred || condition.conditions[0], cell, details);
      }
      break;
    case 'equals': {
      const left = condition.left;
      const rightValue = resolveValue(condition.right, { cell, details });
      if (left.kind === 'cellProperty') {
        cell[left.property] = rightValue;
      }
      break;
    }
    case 'greaterThan': {
      const threshold = resolveValue(condition.right, { cell, details });
      cell.number = getValueMeetingComparison('greaterThan', threshold);
      break;
    }
    case 'greaterOrEqual': {
      const threshold = resolveValue(condition.right, { cell, details });
      cell.number = getValueMeetingComparison('greaterOrEqual', threshold);
      break;
    }
    case 'lessThan': {
      const threshold = resolveValue(condition.right, { cell, details });
      cell.number = getValueMeetingComparison('lessThan', threshold);
      break;
    }
    case 'lessOrEqual': {
      const threshold = resolveValue(condition.right, { cell, details });
      cell.number = getValueMeetingComparison('lessOrEqual', threshold);
      break;
    }
    case 'between': {
      const min = resolveValue(condition.min, { cell, details });
      const max = resolveValue(condition.max, { cell, details });
      [cell.number] = [randomIntFromInterval(min, max)];
      break;
    }
    case 'parity': {
      const parity = resolveValue(condition.parity, { cell, details });
      const domain = numbers.filter((n) => (parity === 'even' ? n % 2 === 0 : n % 2 !== 0));
      cell.number = getRandomElement(domain);
      break;
    }
    case 'prime': {
      const primes = numbers.filter((n) => {
        if (n < 2) return false;
        if (n === 2) return true;
        if (n % 2 === 0) return false;
        for (let i = 3; i <= Math.sqrt(n); i += 2) {
          if (n % i === 0) return false;
        }
        return true;
      });
      cell.number = getRandomElement(primes);
      break;
    }
    case 'multipleOf': {
      const factor = resolveValue(condition.factor, { cell, details });
      const multiples = numbers.filter((n) => n % factor === 0);
      cell.number = getRandomElement(multiples);
      break;
    }
    case 'inRegion': {
      // If region requirement exists in antecedent, ensure by setting position near region boundary.
      const direction = resolveValue(condition.direction, { cell, details });
      const size = resolveValue(condition.size, { cell, details });
      switch (direction) {
        case 'left':
          cell.position.col = randomIntFromInterval(0, size - 1);
          break;
        case 'right':
          cell.position.col = randomIntFromInterval(gridSize - size, gridSize - 1);
          break;
        case 'top':
          cell.position.row = randomIntFromInterval(0, size - 1);
          break;
        case 'bottom':
          cell.position.row = randomIntFromInterval(gridSize - size, gridSize - 1);
          break;
      }
      break;
    }
    default:
      break;
  }
}

function enforceImplicationRule(rule, grid, details) {
  grid.forEach((cell) => {
    if (!evaluateCondition(rule.when, { cell, details, grid })) {
      return;
    }

    for (const action of rule.actions) {
      const result = applyCellAction(action, cell, details);
      if (result.status === 'needsBreak') {
        applyBreakAntecedent(rule, cell, details);
        break;
      }
    }
  });
}

function createImplicationViolation(rule, grid, details) {
  let targetCell = grid.find((cell) => {
    if (!evaluateCondition(rule.when, { cell, details, grid })) {
      return false;
    }
    return rule.actions.every((action) => verifyCellAction(action, cell, details));
  });

  if (!targetCell) {
    targetCell = grid.find((cell) => true) || null;
    if (targetCell) {
      ensureCellSatisfiesCondition(rule.when, targetCell, details);
      rule.actions.forEach((action) => applyCellAction(action, targetCell, details));
    }
  }

  if (targetCell && rule.violation) {
    applyCellAction(rule.violation, targetCell, details);
  }
}

function verifyCellAction(action, cell, details) {
  switch (action.action) {
    case 'setCellProperty': {
      const expected = resolveValue(action.value, { cell, details });
      return cell[action.property] === expected;
    }
    case 'requireRegion': {
      const direction = resolveValue(action.direction, { cell, details });
      const size = resolveValue(action.size, { cell, details });
      return isInRegion(cell, direction, size);
    }
    default:
      return true;
  }
}

function verifyImplicationRule(rule, grid, details) {
  return grid.every((cell) => {
    if (!evaluateCondition(rule.when, { cell, details, grid })) {
      return true;
    }
    return rule.actions.every((action) => verifyCellAction(action, cell, details));
  });
}

function enforceNeighborRule(rule, grid, details) {
  grid.forEach((cell) => {
    if (!evaluateCondition(rule.when, { cell, details, grid })) {
      return;
    }

    const direction = resolveValue(rule.neighbor.direction, { cell, details });
    const neighbors = getNeighborCells(grid, cell, direction);
    if (neighbors.length === 0) {
      applyBreakAntecedent(rule, cell, details);
      return;
    }

    const targetNeighbor = neighbors[0];
    (rule.neighbor.satisfy || []).forEach((action) => {
      ensureNeighbor(action, targetNeighbor, details);
    });
  });
}

function neighborConditionsSatisfied(rule, cell, neighbor, details, grid) {
  return (rule.neighbor.conditions || []).every((condition) =>
    evaluateCondition(condition, { cell, neighbor, details, grid })
  );
}

function createNeighborViolation(rule, grid, details) {
  const direction = (cell) => resolveValue(rule.neighbor.direction, { cell, details });
  let candidate = null;
  let neighbor = null;

  for (const cell of grid) {
    if (!evaluateCondition(rule.when, { cell, details, grid })) {
      continue;
    }
    const neighbors = getNeighborCells(grid, cell, direction(cell));
    const match = neighbors.find((candidateNeighbor) =>
      neighborConditionsSatisfied(rule, cell, candidateNeighbor, details, grid)
    );
    if (match) {
      candidate = cell;
      neighbor = match;
      break;
    }
  }

  if (!candidate || !neighbor) {
    candidate = grid.find((cell) => true) || null;
    if (!candidate) return;
    ensureCellSatisfiesCondition(rule.when, candidate, details);
    const neighbors = getNeighborCells(grid, candidate, direction(candidate));
    if (neighbors.length === 0) {
      applyBreakAntecedent(rule, candidate, details);
      return;
    }
    neighbor = neighbors[0];
    (rule.neighbor.satisfy || []).forEach((action) => {
      ensureNeighbor(action, neighbor, details);
    });
  }

  if (neighbor && rule.neighbor.violation) {
    ensureNeighbor(rule.neighbor.violation, neighbor, details);
  }
}

function verifyNeighborRule(rule, grid, details) {
  return grid.every((cell) => {
    if (!evaluateCondition(rule.when, { cell, details, grid })) {
      return true;
    }
    const direction = resolveValue(rule.neighbor.direction, { cell, details });
    const neighbors = getNeighborCells(grid, cell, direction);
    if (neighbors.length === 0) {
      return false;
    }
    return neighbors.some((neighbor) =>
      neighborConditionsSatisfied(rule, cell, neighbor, details, grid)
    );
  });
}

function enforceRules(definition, grid, details) {
  definition.rules.forEach((rule) => {
    if (rule.type === 'implication') {
      enforceImplicationRule(rule, grid, details);
    } else if (rule.type === 'neighborRequirement') {
      enforceNeighborRule(rule, grid, details);
    } else {
      throw new Error(`Unsupported rule type: ${rule.type}`);
    }
  });
}

function createViolation(definition, grid, details) {
  const rule = getRandomElement(definition.rules);
  if (!rule) return;

  if (rule.type === 'implication') {
    createImplicationViolation(rule, grid, details);
  } else if (rule.type === 'neighborRequirement') {
    createNeighborViolation(rule, grid, details);
  }
}

function verifyRules(definition, grid, details) {
  return definition.rules.every((rule) => {
    if (rule.type === 'implication') {
      return verifyImplicationRule(rule, grid, details);
    }
    if (rule.type === 'neighborRequirement') {
      return verifyNeighborRule(rule, grid, details);
    }
    return true;
  });
}

export function createTemplateFromDefinition(definition) {
  return {
    generateStatements() {
      const details = generateDetails(definition);
      const naturalLanguageStatement = fillTemplate(definition.statement.text, details);
      const formalFOLStatement = fillTemplate(definition.statement.fol, details);
      const hintText = definition.statement.hint
        ? fillTemplate(definition.statement.hint, details)
        : '';
      return { naturalLanguageStatement, formalFOLStatement, hint: hintText, details };
    },

    generateGrid(satisfies, details) {
      const grid = createRandomGrid();
      enforceRules(definition, grid, details);
      if (!satisfies) {
        createViolation(definition, grid, details);
      }
      return { grid, satisfies };
    },

    verifyStatementWithGrid(grid, details) {
      return verifyRules(definition, grid, details);
    }
  };
}
