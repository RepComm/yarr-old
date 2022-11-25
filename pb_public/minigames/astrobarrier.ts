
export interface AstroLevelData {
  width: number;
  height: number;
  tiles: Uint8Array;
}

export interface AstroLevel {
  level: number;
  author: string;
  data: AstroLevelData;
}

export function createLevelData (width: number, height: number): AstroLevelData {
  return {
    width,
    height,
    tiles: new Uint8Array(width * height)
  };
}

export function createLevel (width: number, height: number, author: string, level: number){
  let lvl: AstroLevel = {
    author,
    level,
    data: createLevelData(width, height)
  };
  return lvl;
}

export enum TileType {
  EMPTY,
  RAIL,
  BLOCK
}

export function setTile (x: number, y: number, tile: TileType) {
  
}

export function test () {
  let lvl = createLevel(17, 14, "RepComm", 1);

}
