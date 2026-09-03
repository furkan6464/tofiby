"use client";

import { useEffect, useRef } from "react";
import { GAME_CONFIG } from "@/lib/gameConfig";
import type { CreatureFrames, Palette, SpriteState } from "@/data/creatures/types";
import { GRID } from "@/data/creatures/types";
import type { MicroAnim } from "@/lib/types";

export function PixelSprite({
  frames,
  palette,
  pixelSize = 6,
  state = "idle",
  className = "",
  microAnim = "none",
}: {
  frames: CreatureFrames;
  palette: Palette;
  pixelSize?: number;
  state?: SpriteState;
  className?: string;
  microAnim?: MicroAnim;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const framesRef = useRef(frames);
  const paletteRef = useRef(palette);
  stateRef.current = state;
  framesRef.current = frames;
  paletteRef.current = palette;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let idleIndex = 0;
    let overrideUntil = 0;
    let override: SpriteState | null = null;
    let nextBlink = performance.now() + rand(GAME_CONFIG.IDLE_BLINK_MIN_MS, GAME_CONFIG.IDLE_BLINK_MAX_MS);
    let nextAmbient = performance.now() + rand(GAME_CONFIG.AMBIENT_MOVE_MIN_MS, GAME_CONFIG.AMBIENT_MOVE_MAX_MS);
    const slow = stateRef.current === "sick" || stateRef.current === "sleepy";
    const fps = slow ? GAME_CONFIG.SICK_SPRITE_FPS : GAME_CONFIG.SPRITE_FPS;
    const step = 1000 / fps;
    let doubleBlink = false;

    const draw = (frame: (keyof Palette | null)[][]) => {
      const size = pixelSize;
      canvas.width = GRID * size;
      canvas.height = GRID * size;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const pal = paletteRef.current;
      for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
          const key = frame[y][x];
          if (!key) continue;
          ctx.fillStyle = pal[key];
          ctx.fillRect(x * size, y * size, size, size);
        }
      }
    };

    const tick = (now: number) => {
      acc += now - last;
      last = now;
      const forced = stateRef.current;
      const sick = forced === "sick";
      const worried = forced === "worried";
      const locked = sick || forced === "sleepy" || worried;
      if (forced !== "idle" && forced !== "sleepy" && forced !== "sick" && forced !== "worried") {
        override = forced;
        overrideUntil = now + 700;
      }
      if (forced === "sleepy") override = "sleepy";
      if (sick) override = "sick";
      if (worried) override = "worried";
      if (!locked && now > nextBlink && !override) {
        override = "blink";
        overrideUntil = now + (microAnim === "cift_kirpma" || doubleBlink ? 180 : 220);
        if (microAnim === "cift_kirpma" && !doubleBlink) {
          doubleBlink = true;
          nextBlink = now + 260;
        } else {
          doubleBlink = false;
          nextBlink = now + rand(GAME_CONFIG.IDLE_BLINK_MIN_MS, GAME_CONFIG.IDLE_BLINK_MAX_MS);
        }
      }
      if (!locked && now > nextAmbient && !override) {
        override =
          microAnim === "kuyruk_sallama"
            ? "bounce"
            : Math.random() > 0.5
              ? "look"
              : "yawn";
        overrideUntil = now + 640;
        nextAmbient = now + rand(GAME_CONFIG.AMBIENT_MOVE_MIN_MS, GAME_CONFIG.AMBIENT_MOVE_MAX_MS);
      }
      if (override && now > overrideUntil && forced === "idle") override = null;

      while (acc >= step) {
        acc -= step;
        idleIndex += 1;
      }

      const bank = framesRef.current;
      const mode: SpriteState =
        override ??
        (forced === "sleepy"
          ? "sleepy"
          : sick
            ? "sick"
            : worried
              ? "worried"
              : "idle");
      const strip = bank[mode] ?? bank.idle;
      const frame = strip[idleIndex % strip.length] ?? bank.idle?.[0];
      if (frame) draw(frame);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pixelSize, state, microAnim]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: GRID * pixelSize,
        height: GRID * pixelSize,
        imageRendering: "pixelated",
        transform: microAnim === "minik_donus" && state === "idle" ? "rotate(-4deg)" : undefined,
      }}
    />
  );
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}
