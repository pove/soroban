/** Builds the DOM of one card side (used by previews, the saved list and the print view). */
import { abacusSvg } from './abacusSvg.js';
import { sideOf } from './model.js';

function textBlock(text, color, size) {
  const block = document.createElement('div');
  block.className = 'card-text';
  block.style.color = color;
  block.style.fontSize = `${size}px`;
  block.textContent = text;
  return block;
}

/**
 * @param {object} card
 * @param {'front'|'rear'} side
 * @returns {HTMLElement}
 */
export function createCardElement(card, side) {
  const face = sideOf(card, side);

  const element = document.createElement('div');
  element.className = 'card';
  element.style.width = `${card.width}mm`;
  element.style.height = `${card.height}mm`;
  element.style.border = `${card.borderThickness}px solid ${card.borderColor}`;
  element.style.borderRadius = `${card.borderRadius}px`;
  element.style.backgroundColor = card.backgroundColor;

  const middle = document.createElement('div');
  middle.className = 'card-middle';
  if (face.showSVG) {
    const scale = face.svgSize / 100;
    middle.innerHTML = abacusSvg(face.svgNumber, card.width * 2.5 * scale, card.height * 1.5 * scale);
  }

  element.append(
    textBlock(face.topText, face.topColor, face.topSize),
    middle,
    textBlock(face.bottomText, face.bottomColor, face.bottomSize),
  );
  return element;
}
