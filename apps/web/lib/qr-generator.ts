/**
 * Lightweight, zero-dependency QR Code matrix generator in pure TypeScript.
 * Generates matrix representation (2D boolean array) suitable for SVG/Canvas rendering.
 */

// QR Code Constants & Tables
const PAD0 = 0xec;
const PAD1 = 0x11;

const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(function initGalois() {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = val;
    EXP_TABLE[i + 255] = val;
    LOG_TABLE[val] = i;
    val <<= 1;
    if (val & 0x100) val ^= 0x11d;
  }
})();

function glog(n: number) {
  if (n < 1) throw new Error("glog(" + n + ")");
  return LOG_TABLE[n];
}

function gexp(n: number) {
  while (n < 0) n += 255;
  while (n >= 256) n -= 255;
  return EXP_TABLE[n];
}

function rsMultiply(p1: number[], p2: number[]) {
  const result = new Array(p1.length + p2.length - 1).fill(0);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      if (p1[i] !== 0 && p2[j] !== 0) {
        result[i + j] ^= gexp(glog(p1[i]) + glog(p2[j]));
      }
    }
  }
  return result;
}

function rsGeneratorPoly(numEc: number) {
  let g = [1];
  for (let i = 0; i < numEc; i++) {
    g = rsMultiply(g, [1, gexp(i)]);
  }
  return g;
}

function calculateEcc(data: number[], numEc: number): number[] {
  const gen = rsGeneratorPoly(numEc);
  const msg = [...data, ...new Array(numEc).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const lead = msg[i];
    if (lead !== 0) {
      const factor = glog(lead);
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gexp(factor + glog(gen[j]));
      }
    }
  }
  return msg.slice(data.length);
}

// Version table definitions (Versions 1 to 10 for URL lengths up to 271 bytes)
// [version, totalCodewords, ecCodewordsPerBlock, numBlocksG1, dataCodewordsG1, numBlocksG2, dataCodewordsG2]
const VERSION_TABLE_M: Record<number, [number, number, number, number, number, number, number]> = {
  1: [1, 26, 10, 1, 16, 0, 0],
  2: [2, 44, 16, 1, 28, 0, 0],
  3: [3, 70, 26, 1, 44, 0, 0],
  4: [4, 100, 18, 2, 32, 0, 0],
  5: [5, 134, 24, 2, 43, 0, 0],
  6: [6, 172, 16, 4, 27, 0, 0],
  7: [7, 196, 18, 4, 31, 0, 0],
  8: [8, 242, 22, 2, 38, 2, 39],
  9: [9, 292, 22, 3, 36, 2, 37],
  10: [10, 346, 26, 4, 43, 1, 44],
};

const ALIGNMENT_PATTERN_POSITIONS: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

const FORMAT_INFO = [
  0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0,
  0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976,
  0x1689, 0x13be, 0x1ce7, 0x19d0, 0x0762, 0x0255, 0x0d0c, 0x083b,
  0x355f, 0x3068, 0x3f31, 0x3a06, 0x24b4, 0x2183, 0x2eda, 0x2bed,
];

export function createQRCodeMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  const dataLen = bytes.length;

  // Determine minimum version
  let version = 1;
  while (version <= 10) {
    const info = VERSION_TABLE_M[version];
    const totalDataCapacity = info[3] * info[4] + info[5] * info[6];
    // 4 bits mode + 8 bits (or 16 bits) length count
    const headerBits = version < 10 ? 4 + 8 : 4 + 16;
    const requiredBits = headerBits + dataLen * 8;
    if (requiredBits <= totalDataCapacity * 8) break;
    version++;
  }

  if (version > 10) version = 10;
  const verInfo = VERSION_TABLE_M[version];
  const totalDataCapacity = verInfo[3] * verInfo[4] + verInfo[5] * verInfo[6];

  // Bit Buffer
  const bitBuffer: number[] = [];
  function putBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bitBuffer.push((val >> i) & 1);
    }
  }

  // Byte mode header
  putBits(0b0100, 4);
  putBits(dataLen, version < 10 ? 8 : 16);
  for (let i = 0; i < dataLen; i++) {
    putBits(bytes[i], 8);
  }

  // Terminator
  const maxBits = totalDataCapacity * 8;
  const terminatorLen = Math.min(4, maxBits - bitBuffer.length);
  for (let i = 0; i < terminatorLen; i++) bitBuffer.push(0);

  // Align to byte
  while (bitBuffer.length % 8 !== 0) bitBuffer.push(0);

  // Convert bits to codewords
  const dataCodewords: number[] = [];
  for (let i = 0; i < bitBuffer.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bitBuffer[i + j];
    }
    dataCodewords.push(b);
  }

  // Pad remaining capacity
  let padToggle = false;
  while (dataCodewords.length < totalDataCapacity) {
    dataCodewords.push(padToggle ? PAD1 : PAD0);
    padToggle = !padToggle;
  }

  // Split data into blocks & calculate ECC
  const blocks: { data: number[]; ecc: number[] }[] = [];
  let byteOffset = 0;
  const numBlocksG1 = verInfo[3];
  const dataPerBlockG1 = verInfo[4];
  const numBlocksG2 = verInfo[5];
  const dataPerBlockG2 = verInfo[6];
  const ecPerBlock = verInfo[2];

  for (let b = 0; b < numBlocksG1; b++) {
    const d = dataCodewords.slice(byteOffset, byteOffset + dataPerBlockG1);
    byteOffset += dataPerBlockG1;
    blocks.push({ data: d, ecc: calculateEcc(d, ecPerBlock) });
  }
  for (let b = 0; b < numBlocksG2; b++) {
    const d = dataCodewords.slice(byteOffset, byteOffset + dataPerBlockG2);
    byteOffset += dataPerBlockG2;
    blocks.push({ data: d, ecc: calculateEcc(d, ecPerBlock) });
  }

  // Interleave data codewords
  const finalCodewords: number[] = [];
  const maxDataLen = Math.max(dataPerBlockG1, dataPerBlockG2 || 0);
  for (let i = 0; i < maxDataLen; i++) {
    for (let b = 0; b < blocks.length; b++) {
      if (i < blocks[b].data.length) finalCodewords.push(blocks[b].data[i]);
    }
  }
  // Interleave ECC codewords
  for (let i = 0; i < ecPerBlock; i++) {
    for (let b = 0; b < blocks.length; b++) {
      if (i < blocks[b].ecc.length) finalCodewords.push(blocks[b].ecc[i]);
    }
  }

  // Matrix construction
  const size = version * 4 + 17;
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    new Array(size).fill(null)
  );

  function setModule(r: number, c: number, val: boolean) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
    }
  }

  // Finder Patterns
  function addFinderPattern(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        if (r === -1 || r === 7 || c === -1 || c === 7) {
          matrix[nr][nc] = false; // separator
        } else if (r === 0 || r === 6 || c === 0 || c === 6) {
          matrix[nr][nc] = true;
        } else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
          matrix[nr][nc] = true;
        } else {
          matrix[nr][nc] = false;
        }
      }
    }
  }

  addFinderPattern(0, 0);
  addFinderPattern(0, size - 7);
  addFinderPattern(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0;
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0;
  }

  // Alignment patterns
  const alignPos = ALIGNMENT_PATTERN_POSITIONS[version] || [];
  for (let i = 0; i < alignPos.length; i++) {
    for (let j = 0; j < alignPos.length; j++) {
      const r = alignPos[i];
      const c = alignPos[j];
      // Skip if overlapping finder patterns
      if (matrix[r][c] !== null) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
          const isCenter = dr === 0 && dc === 0;
          matrix[r + dr][c + dc] = isBorder || isCenter;
        }
      }
    }
  }

  // Dark module
  matrix[4 * version + 9][8] = true;

  // Reserve Format Information areas
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    if (matrix[i][8] === null) matrix[i][8] = false;
  }
  for (let i = 0; i < 8; i++) {
    if (matrix[8][size - 1 - i] === null) matrix[8][size - 1 - i] = false;
    if (matrix[size - 1 - i][8] === null) matrix[size - 1 - i][8] = false;
  }

  // Place data bits into matrix
  const allBits: number[] = [];
  for (const cw of finalCodewords) {
    for (let i = 7; i >= 0; i--) {
      allBits.push((cw >> i) & 1);
    }
  }

  let bitIdx = 0;
  let direction = -1;
  let col = size - 1;

  while (col > 0) {
    if (col === 6) col--; // skip timing column
    const rows = direction === -1
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const row of rows) {
      for (let c = 0; c < 2; c++) {
        const cc = col - c;
        if (matrix[row][cc] === null) {
          let bit = false;
          if (bitIdx < allBits.length) {
            bit = allBits[bitIdx++] === 1;
          }
          // Mask pattern 0: (row + col) % 2 === 0
          const mask = (row + cc) % 2 === 0;
          matrix[row][cc] = mask ? !bit : bit;
        }
      }
    }
    col -= 2;
    direction = -direction;
  }

  // Write Format Information (ECC Level M = 00, Mask 0 = 000 -> format 0 = 0x5412)
  const fmt = FORMAT_INFO[0]; // Mask 0, ECC M
  for (let i = 0; i < 15; i++) {
    const bit = ((fmt >> i) & 1) === 1;
    // Top-left
    if (i < 6) matrix[i][8] = bit;
    else if (i === 6) matrix[7][8] = bit;
    else if (i === 7) matrix[8][8] = bit;
    else if (i === 8) matrix[8][7] = bit;
    else matrix[8][14 - i] = bit;

    // Split format bits around borders
    if (i < 8) matrix[8][size - 1 - i] = bit;
    else matrix[size - 15 + i][8] = bit;
  }

  return matrix.map((row) => row.map((cell) => !!cell));
}
