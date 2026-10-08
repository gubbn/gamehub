import { useState } from "react";
import type { Picture } from "./eli-data";

export const eliShapeIds = [
  "circle",
  "square",
  "triangle",
  "star",
  "heart",
  "diamond",
  "oval",
  "rectangle",
  "pentagon",
  "hexagon",
] as const;
export function EliPicture({
  picture,
  hiddenLabel = false,
}: {
  picture: Picture;
  hiddenLabel?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = picture.image || picture.asset;
  const shape = {
    circle: <circle cx="80" cy="80" r="58" />,
    square: <rect x="25" y="25" width="110" height="110" />,
    triangle: <polygon points="80,28 140,132 20,132" />,
    star: (
      <polygon points="80,14 99,59 147,63 111,96 122,144 80,117 38,144 49,96 13,63 61,59" />
    ),
    heart: (
      <path d="M80 139C65 127 21 94 21 59C21 21 63 17 80 46C97 17 139 21 139 59C139 94 95 127 80 139Z" />
    ),
    diamond: <polygon points="80,18 136,80 80,142 24,80" />,
    oval: <ellipse cx="80" cy="80" rx="62" ry="40" />,
    rectangle: <rect x="18" y="43" width="124" height="74" />,
    pentagon: <polygon points="80,18 139,61 116,131 44,131 21,61" />,
    hexagon: <polygon points="48,25 112,25 144,80 112,135 48,135 16,80" />,
  }[picture.id as (typeof eliShapeIds)[number]];
  const symbol =
    picture.kind === "letter" ? (
      <text
        x="80"
        y="103"
        textAnchor="middle"
        fontSize="60"
        fontFamily="Trebuchet MS, sans-serif"
      >
        {picture.symbol} {picture.symbol?.toLowerCase()}
      </text>
    ) : picture.kind === "number" ? (
      <>
        <text
          x="80"
          y={
            Number(picture.symbol) > 0 && Number(picture.symbol) <= 10
              ? "72"
              : "108"
          }
          textAnchor="middle"
          fontSize="72"
          fontFamily="Trebuchet MS, sans-serif"
        >
          {picture.symbol}
        </text>
        {Number(picture.symbol) <= 10 &&
          Array.from({ length: Number(picture.symbol) }, (_, i) => (
            <circle
              key={i}
              cx={30 + (i % 5) * 25}
              cy={105 + Math.floor(i / 5) * 25}
              r="8"
            />
          ))}
      </>
    ) : picture.kind === "colour" ? (
      <rect
        x="20"
        y="20"
        width="120"
        height="120"
        rx="8"
        stroke="#8c8c8c"
        strokeWidth="1.5"
      />
    ) : null;
  return (
    <div
      className={`eli-picture-art ${source ? "illustrated" : "geometric"}`}
      style={{ "--picture-color": picture.color } as React.CSSProperties}
    >
      {source && failedSource !== source ? (
        <img
          src={source}
          alt={hiddenLabel ? "" : picture.label}
          draggable={false}
          decoding="async"
          onError={() => setFailedSource(source)}
        />
      ) : shape || symbol ? (
        <svg
          className="eli-shape-art"
          viewBox="0 0 160 160"
          role={hiddenLabel ? undefined : "img"}
          aria-label={hiddenLabel ? undefined : picture.label}
          aria-hidden={hiddenLabel || undefined}
        >
          {shape || symbol}
        </svg>
      ) : (
        <span className="eli-image-unavailable">
          Picture unavailable. Reload when online.
        </span>
      )}
    </div>
  );
}
