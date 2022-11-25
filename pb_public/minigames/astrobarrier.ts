
export function _2dTo1d(x: number, y: number, width: number) {
  return x + width * y;
}
export function _1dTo2dX(index: number, width: number) {
  return index % width;
}
export function _1dTo2dY(index: number, width: number) {
  return index / width;
}
/**Linear interpolation between from and to, using 0.0 - 1.0 interpolant `by`*/

export const lerp = (from: number, to: number, by: number) => {
  return from * (1 - by) + to * by;
};
/**Performs the inverse of lerp
 * Will give you the interpolant given the interpolated number and its bounds (to and from)
 */

export const inverseLerp = (from: number, to: number, value: number) => {
  return (value - from) / (to - from);
};

export enum TileType {
  EMPTY,
  RAIL,
  BLOCK,
  
  CELL_BLUE,
  CELL_GREEN,

  TARGET_ORANGE,
  BLOCK_ORANGE,

  SHIP
}

export type LevelDataBinary = Uint8Array;
export type LevelDataText = Array<string>;

export interface AstroLevelData {
  width: number;
  height: number;
  tiles: LevelDataBinary;
}

export interface AstroLevelDataJson {
  width: number;
  height: number;
  tiles: LevelDataText;
}

export interface AstroLevelJson {
  author: string;
  level: number;
  data: AstroLevelDataJson;
}

export function createLevelData (width: number, height: number): AstroLevelData {
  return {
    width,
    height,
    tiles: new Uint8Array(width * height)
  };
}

export class Level {
  author: string;
  level: number;
  data: AstroLevelData;

  constructor (author: string, level: number, width: number, height: number) {
    this.author = author;
    this.level = level;
    this.data = createLevelData(width, height);
  }
  setTile (x: number, y: number, tile: TileType): this;
  setTile (index: number, tile: TileType): this;

  setTile (a: number, b: number, c?: number) {
    let x: number;
    let y: number;
    let tileType: number;
    let index: number;

    if (c === undefined) {
      index = a;
      tileType = b;

    } else {
      x = a;
      y = b;
      tileType = c;
      index = _2dTo1d(x, y, this.data.width);
    }
    
    this.data.tiles[index] = tileType;

    return this;
  }
  getTile (x: number, y: number): TileType;
  getTile (index: number): TileType;
  getTile (a: number, b?: number): TileType {
    let x: number;
    let y: number;
    let index: number;

    if (b === undefined) {
      index = a;
    } else {
      x = a;
      y = b;
      index = _2dTo1d(x, y, this.data.width);
    }
    return this.data.tiles[index];
  }
}

export type LevelsJson = Array<AstroLevelJson>;

export const TileTextToBinMap = {
  " ": TileType.EMPTY,
  "g": TileType.CELL_GREEN,
  "b": TileType.CELL_BLUE,
  "-": TileType.RAIL,
  "|": TileType.RAIL,
  "+": TileType.RAIL,
  "$": TileType.SHIP,
  "!": TileType.BLOCK,
  "*": TileType.TARGET_ORANGE,
  "#": TileType.BLOCK_ORANGE
};

export async function loadLevels (url: string): Promise<Array<Level>> {
  let resp = await fetch(url);
  let lvls: LevelsJson = await resp.json();

  let maxWidth = 0;
  let maxHeight = 0;

  let result = new Array<Level>();

  for (let lvl of lvls) {
    maxHeight = lvl.data.tiles.length;

    for (let line of lvl.data.tiles) {
      let len = line.length;
      if (len > maxWidth) maxWidth = len;
    }

    let level = new Level(lvl.author, lvl.level, maxWidth, maxHeight);
    
    for (let y=0; y<maxHeight; y++) { let line = lvl.data.tiles[y]; for (let x=0; x<maxWidth; x++) {
      let tileTypeBin = TileTextToBinMap[ line.charAt(x) ];
      level.setTile(x, y, tileTypeBin);
    }}

    result.push(level);
  }

  return result;
}

export function test () {
  let levels = loadLevels("./minigames/astrobarrier.levels.json");

  
}
