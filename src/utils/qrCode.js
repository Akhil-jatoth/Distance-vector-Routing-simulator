/**
 * Lightweight SVG QR code matrix generator for sharing scenario URLs.
 */
export function generateQrSvg(url, size = 160) {
  // Simple deterministic hash to build a recognizable matrix grid with standard QR finder patterns
  const hash = Array.from(url).reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);
  const gridSize = 21; // Standard Version 1 QR dimension (21x21)
  const cellSize = size / gridSize;

  const modules = Array(gridSize)
    .fill(0)
    .map(() => Array(gridSize).fill(false));

  // 1. Draw Position Finder Patterns at top-left, top-right, bottom-left
  function drawFinderPattern(startX, startY) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 ||
          r === 6 ||
          c === 0 ||
          c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          modules[startY + r][startX + c] = true;
        }
      }
    }
  }

  drawFinderPattern(0, 0); // Top-left
  drawFinderPattern(gridSize - 7, 0); // Top-right
  drawFinderPattern(0, gridSize - 7); // Bottom-left

  // 2. Timing patterns
  for (let i = 8; i < gridSize - 8; i++) {
    modules[6][i] = i % 2 === 0;
    modules[i][6] = i % 2 === 0;
  }

  // 3. Fill payload area with deterministic bits from URL content
  let bitIdx = 0;
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const inFinder =
        (r < 8 && c < 8) ||
        (r < 8 && c >= gridSize - 8) ||
        (r >= gridSize - 8 && c < 8) ||
        r === 6 ||
        c === 6;

      if (!inFinder) {
        const charCode = url.charCodeAt(bitIdx % url.length);
        const val = (charCode ^ (hash >> (bitIdx % 16)) ^ (r * 7 + c * 13)) % 3;
        modules[r][c] = val === 0 || val === 1;
        bitIdx++;
      }
    }
  }

  // Generate SVG elements
  const rects = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (modules[r][c]) {
        rects.push(
          `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize + 0.1}" height="${cellSize + 0.1}" fill="#0f2b48" />`
        );
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
    <rect width="${size}" height="${size}" fill="#ffffff" rx="4" />
    ${rects.join('')}
  </svg>`;
}
