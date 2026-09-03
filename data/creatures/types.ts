export type PaletteKey =
  | "body"
  | "shade"
  | "belly"
  | "eye"
  | "highlight"
  | "blush"
  | "outline"
  | "accent"
  | "shell"
  | "shellShade"
  | "speckle"
  | "lid";

export type Pixel = PaletteKey | null;
export type PixelFrame = Pixel[][];

export type Palette = Record<PaletteKey, string>;

export type SpriteState =
  | "idle"
  | "blink"
  | "bounce"
  | "happy"
  | "sleepy"
  | "look"
  | "yawn"
  | "sick"
  | "sparkle"
  | "crack";

export interface CreatureFrames {
  idle: PixelFrame[];
  blink: PixelFrame[];
  bounce: PixelFrame[];
  happy: PixelFrame[];
  sleepy: PixelFrame[];
  look: PixelFrame[];
  yawn: PixelFrame[];
  sick: PixelFrame[];
  sparkle: PixelFrame[];
  crack: PixelFrame[];
}

export interface CreatureSpec {
  speciesId: string;
  stage: string;
  frames: CreatureFrames;
  palette: Palette;
}

export const GRID = 20;
