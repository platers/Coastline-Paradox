export type RawPoint = [number, number];
export type RawLine = [RawPoint, RawPoint];
export type Chunk = string;
export type Chunks = {
  [key: Chunk]: RawLine[];
};