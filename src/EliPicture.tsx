import { useState } from "react";
import type { Picture } from "./eli-data";

export const eliShapeIds = [
  "circle",
  "square",
  "triangle",
  "star",
  "heart",
  "diamond",
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
  }[picture.id as (typeof eliShapeIds)[number]];
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
      ) : shape ? (
        <svg
          className="eli-shape-art"
          viewBox="0 0 160 160"
          role={hiddenLabel ? undefined : "img"}
          aria-label={hiddenLabel ? undefined : picture.label}
          aria-hidden={hiddenLabel || undefined}
        >
          {shape}
        </svg>
      ) : (
        <span className="eli-image-unavailable">
          Picture unavailable. Reload when online.
        </span>
      )}
    </div>
  );
}
