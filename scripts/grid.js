// scripts/grid.js

import { gridSize } from './utils.js';

function clearGrid() {
    const gridContainer = document.getElementById('grid-container');
    gridContainer.innerHTML = '';
}

function createSvgShape(shape, color, number) {
    const namespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(namespace, 'svg');
    svg.setAttribute('viewBox', '0 0 120 120');
    svg.setAttribute('class', 'shape');

    let shapeElement;
    const textElement = document.createElementNS(namespace, 'text');

    switch (shape) {
        case 'circle':
            shapeElement = document.createElementNS(namespace, 'circle');
            shapeElement.setAttribute('cx', '60');
            shapeElement.setAttribute('cy', '60');
            shapeElement.setAttribute('r', '46');
            break;
        case 'square':
            shapeElement = document.createElementNS(namespace, 'rect');
            shapeElement.setAttribute('x', '12');
            shapeElement.setAttribute('y', '12');
            shapeElement.setAttribute('width', '96');
            shapeElement.setAttribute('height', '96');
            shapeElement.setAttribute('rx', '22');
            shapeElement.setAttribute('ry', '22');
            break;
        case 'triangle':
            shapeElement = document.createElementNS(namespace, 'polygon');
            shapeElement.setAttribute('points', '60,16 106,108 14,108');
            break;
    }

    shapeElement.setAttribute('fill', color);
    svg.appendChild(shapeElement);

    // Place a number in the center
    textElement.setAttribute('x', '50%');
    textElement.setAttribute('y', '50%');
    textElement.setAttribute('dominant-baseline', 'middle');
    textElement.setAttribute('text-anchor', 'middle');
    textElement.setAttribute('fill', '#fffef8');
    textElement.setAttribute('font-size', '28');
    textElement.setAttribute('font-weight', '700');
    textElement.setAttribute('class', 'cell-number');
    textElement.textContent = number;
    svg.appendChild(textElement);

    return svg;
}

function populateGrid(gridData) {
    const gridContainer = document.getElementById('grid-container');
    gridData.forEach(item => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        const svg = createSvgShape(item.shape, item.color, item.number);
        cell.appendChild(svg);

        // Store row,col in data attribute for potential usage
        cell.setAttribute('data-position', `${item.position.row},${item.position.col}`);
        gridContainer.appendChild(cell);
    });
}

export function displayGrid(gridData) {
    clearGrid();
    populateGrid(gridData);
}
