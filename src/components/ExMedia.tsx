"use client";

import { useState } from "react";
import { Barbell } from "@phosphor-icons/react";
import type { ExerciseIndex } from "@/lib/types";
import { gifUrl, imgUrl } from "@/lib/data";

export function ExThumb({
  ex,
  size = 56,
  rounded = "rounded-[12px]",
}: {
  ex: ExerciseIndex;
  size?: number;
  rounded?: string;
}) {
  const [err, setErr] = useState(false);
  if (!ex.m || err) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center ${rounded} bg-surface-3 text-ink-3`}
        style={{ width: size, height: size }}
      >
        <Barbell size={size * 0.42} weight="duotone" />
      </span>
    );
  }
  return (
    <span
      className={`block shrink-0 overflow-hidden ${rounded} bg-white`}
      style={{ width: size, height: size }}
    >
      <img
        src={imgUrl(ex)}
        alt={ex.n}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setErr(true)}
        className="h-full w-full object-contain"
      />
    </span>
  );
}

export function ExMedia({
  ex,
  animate = false,
  className = "",
}: {
  ex: ExerciseIndex;
  animate?: boolean;
  className?: string;
}) {
  const [gifReady, setGifReady] = useState(false);
  const [gifErr, setGifErr] = useState(false);

  if (!ex.m) {
    return (
      <div
        className={`flex aspect-[4/3] w-full items-center justify-center rounded-[16px] bg-surface-2 text-ink-3 ${className}`}
      >
        <Barbell size={44} weight="duotone" />
      </div>
    );
  }

  return (
    <div
      className={`relative aspect-[4/3] w-full overflow-hidden rounded-[16px] bg-white ${className}`}
    >
      <img
        src={imgUrl(ex)}
        alt={ex.n}
        loading="lazy"
        decoding="async"
        className={`absolute inset-0 h-full w-full object-contain p-3 transition-opacity duration-300 ${
          animate && gifReady && !gifErr ? "opacity-0" : "opacity-100"
        }`}
      />
      {animate && !gifErr && (
        <img
          src={gifUrl(ex)}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setGifReady(true)}
          onError={() => setGifErr(true)}
          className={`absolute inset-0 h-full w-full object-contain p-3 transition-opacity duration-300 ${
            gifReady ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}
