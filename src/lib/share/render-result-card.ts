import { calculateCoverCrop, type CropLandmark } from "./crop";
import { formatScore } from "@/lib/format";

export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1350;
export const SHARE_PHOTO_HEIGHT = 945; // 70% of total height

export interface RenderCardOptions {
  image: HTMLImageElement | ImageBitmap;
  harmonyScore: number | null | undefined;
  frontScore?: number | null | undefined;
  profileScore?: number | null | undefined;
  landmarks?: CropLandmark[];
  focusY?: number;
}

/**
 * Resolves a CSS variable font-family name safely for Canvas 2D contexts.
 * Canvas IDL font setters reject CSS var() syntax, falling back to default 10px sans-serif.
 * This extracts the evaluated computed font-family name or falls back to system stacks.
 */
function getComputedFontFamily(cssVar: string, fallback: string): string {
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      const val = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
      if (val) {
        // Strip enclosing quotes if present
        const cleaned = val.replace(/^["']|["']$/g, "");
        return `"${cleaned}", ${fallback}`;
      }
    } catch {
      // Fallback
    }
  }
  return fallback;
}

export function getSansFont(weight: number, size: number): string {
  const family = getComputedFontFamily(
    "--font-familjen",
    '"Familjen Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  );
  return `${weight} ${size}px ${family}`;
}

export function getMonoFont(weight: number, size: number): string {
  const family = getComputedFontFamily(
    "--font-plex-mono",
    '"IBM Plex Mono", ui-monospace, Menlo, Monaco, Consolas, monospace',
  );
  return `${weight} ${size}px ${family}`;
}

/**
 * Renders the 1080x1350 MogLabs shareable portrait card onto a canvas and returns a PNG Blob.
 */
export async function renderResultCard(options: RenderCardOptions): Promise<Blob> {
  const { image, harmonyScore, frontScore, profileScore, landmarks, focusY } = options;

  // Ensure fonts are resolved if running in a browser
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Font loading failure fallback to system fonts
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = SHARE_CARD_WIDTH;
  canvas.height = SHARE_CARD_HEIGHT;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to create 2D canvas context for share card generation.");
  }

  // 1. Background fill
  ctx.fillStyle = "#090e17";
  ctx.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);

  // 2. Render user's front photograph (top 70%) with landmark-aware cover crop
  const imageWidth = "naturalWidth" in image ? image.naturalWidth : image.width;
  const imageHeight = "naturalHeight" in image ? image.naturalHeight : image.height;

  const crop = calculateCoverCrop(
    imageWidth,
    imageHeight,
    SHARE_CARD_WIDTH,
    SHARE_PHOTO_HEIGHT,
    focusY ?? 0.38,
    landmarks,
  );

  ctx.drawImage(
    image,
    crop.sx,
    crop.sy,
    crop.sw,
    crop.sh,
    0,
    0,
    SHARE_CARD_WIDTH,
    SHARE_PHOTO_HEIGHT,
  );

  // Subtle vignette / bottom gradient on the photo for seamless transition to footer
  const photoFadeGradient = ctx.createLinearGradient(0, SHARE_PHOTO_HEIGHT - 120, 0, SHARE_PHOTO_HEIGHT);
  photoFadeGradient.addColorStop(0, "rgba(9, 14, 23, 0)");
  photoFadeGradient.addColorStop(1, "rgba(9, 14, 23, 0.95)");
  ctx.fillStyle = photoFadeGradient;
  ctx.fillRect(0, SHARE_PHOTO_HEIGHT - 120, SHARE_CARD_WIDTH, 120);

  // 3. Subtle lab registration marks on photograph
  const strokeColor = "rgba(240, 246, 252, 0.4)";
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2.5;

  // Corner brackets on photo
  const pad = 48;
  const arm = 28;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(pad, pad + arm);
  ctx.lineTo(pad, pad);
  ctx.lineTo(pad + arm, pad);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(SHARE_CARD_WIDTH - pad - arm, pad);
  ctx.lineTo(SHARE_CARD_WIDTH - pad, pad);
  ctx.lineTo(SHARE_CARD_WIDTH - pad, pad + arm);
  ctx.stroke();

  // 4. Hairline divider between photo and footer
  ctx.strokeStyle = "rgba(226, 232, 240, 0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, SHARE_PHOTO_HEIGHT);
  ctx.lineTo(SHARE_CARD_WIDTH, SHARE_PHOTO_HEIGHT);
  ctx.stroke();

  // 5. Card Footer Content (Bottom 405px)
  const footerTop = SHARE_PHOTO_HEIGHT;
  const leftMargin = 72;
  const rightMargin = SHARE_CARD_WIDTH - 72;

  // 5A. Brand Header Row
  const brandRowY = footerTop + 68;

  // MogLabs Logo Mark (Geometric square + crosshair + center circle, matching Mark component)
  const markSize = 40;
  const markX = leftMargin;
  const markY = brandRowY - 26;
  const markRadius = 8;

  // Rounded rectangle base
  ctx.fillStyle = "#38bdf8"; // restrained sky/cyan lab accent
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(markX, markY, markSize, markSize, markRadius);
  } else {
    ctx.rect(markX, markY, markSize, markSize);
  }
  ctx.fill();

  // Crosshairs
  ctx.strokeStyle = "#090e17";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(markX + markSize / 2, markY + 6);
  ctx.lineTo(markX + markSize / 2, markY + markSize - 6);
  ctx.moveTo(markX + 6, markY + markSize / 2);
  ctx.lineTo(markX + markSize - 6, markY + markSize / 2);
  ctx.stroke();

  // Center circle in crosshair
  ctx.beginPath();
  ctx.arc(markX + markSize / 2, markY + markSize / 2, 7, 0, Math.PI * 2);
  ctx.stroke();

  // MogLabs Wordmark
  ctx.fillStyle = "#f8fafc";
  ctx.font = getSansFont(700, 32);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText("MOGLABS", markX + markSize + 16, brandRowY - 6);

  // Label at right
  ctx.fillStyle = "#64748b";
  ctx.font = getMonoFont(500, 18);
  ctx.textAlign = "right";
  ctx.fillText("FACIAL GEOMETRY LAB", rightMargin, brandRowY - 6);

  // 5B. Score Row
  const scoreRowY = brandRowY + 105;

  // Harmony Label
  ctx.fillStyle = "#94a3b8";
  ctx.font = getSansFont(600, 20);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("HARMONY", leftMargin, scoreRowY);

  // Large Score
  const harmonyText = formatScore(harmonyScore);
  ctx.fillStyle = "#ffffff";
  ctx.font = getMonoFont(600, 120);
  ctx.textBaseline = "alphabetic";
  ctx.fillText(harmonyText, leftMargin, scoreRowY + 115);

  // Scale "/ 10" (only when a valid finite score is present)
  if (harmonyScore !== null && harmonyScore !== undefined && Number.isFinite(harmonyScore)) {
    const scoreWidth = ctx.measureText(harmonyText).width;
    ctx.fillStyle = "#64748b";
    ctx.font = getMonoFont(400, 40);
    ctx.fillText("/ 10", leftMargin + scoreWidth + 20, scoreRowY + 115);
  }

  // 5C. Right-aligned Front & Profile compact metrics
  if (frontScore !== undefined || profileScore !== undefined) {
    const compactY = scoreRowY + 20;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";

    if (frontScore !== undefined && frontScore !== null) {
      ctx.fillStyle = "#64748b";
      ctx.font = getMonoFont(500, 16);
      ctx.fillText("FRONT", rightMargin, compactY);

      ctx.fillStyle = "#e2e8f0";
      ctx.font = getMonoFont(600, 28);
      ctx.fillText(formatScore(frontScore), rightMargin, compactY + 22);
    }

    if (profileScore !== undefined && profileScore !== null) {
      const profileY = compactY + 62;
      ctx.fillStyle = "#64748b";
      ctx.font = getMonoFont(500, 16);
      ctx.fillText("PROFILE", rightMargin, profileY);

      ctx.fillStyle = "#e2e8f0";
      ctx.font = getMonoFont(600, 28);
      ctx.fillText(formatScore(profileScore), rightMargin, profileY + 22);
    }
  }

  // 5D. Descriptor line
  const descY = scoreRowY + 172;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#64748b";
  ctx.font = getSansFont(400, 20);
  ctx.fillText("Proportional reference score", leftMargin, descY);

  // Return blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to export canvas to PNG blob."));
        }
      },
      "image/png",
      1.0,
    );
  });
}
