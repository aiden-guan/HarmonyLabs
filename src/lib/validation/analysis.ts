import { z } from "zod";
import { LANDMARK_GUIDE } from "@/lib/face/semantic-landmarks";
import { maxUploadBytes } from "@/lib/env";

const landmarkKeys = new Set(Object.keys(LANDMARK_GUIDE));

export const landmarkInputSchema = z
  .object({
    key: z.string().refine((key) => landmarkKeys.has(key), "Unknown landmark"),
    x: z.number().finite().min(0).max(1),
    y: z.number().finite().min(0).max(1),
    z: z.number().finite().optional(),
    confidence: z.number().finite().min(0).max(1),
    source: z.enum(["mediapipe", "derived", "manual"]),
  })
  .strict();

export const photoQualitySchema = z
  .object({
    faceDetected: z.boolean(),
    faceCount: z.number().int().min(0),
    yaw: z.number().finite().nullable(),
    pitch: z.number().finite().nullable(),
    roll: z.number().finite().nullable(),
    blurScore: z.number().finite(),
    brightnessScore: z.number().finite(),
    faceCoverage: z.number().finite(),
    warnings: z.array(z.string().max(400)).max(20),
    notes: z.array(z.string().max(400)).max(8).optional(),
    mirrored: z.boolean(),
  })
  .strict();

export const landmarkSaveSchema = z
  .object({
    view: z.enum(["front", "profile"]),
    landmarks: z.array(landmarkInputSchema).min(1).max(80),
    quality: photoQualitySchema.optional(),
    detected: z.boolean().optional(),
  })
  .strict();

export const completeSchema = z
  .object({
    front: z.array(landmarkInputSchema).min(1).max(80),
    profile: z.array(landmarkInputSchema).min(1).max(80),
  })
  .strict();

export const chatSchema = z
  .object({
    analysisId: z.string().uuid(),
    message: z.string().trim().min(1).max(2000),
  })
  .strict();

export const createAnalysisSchema = z
  .object({
    name: z.string().trim().max(80).optional(),
  })
  .strict();

export const profileSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80),
  })
  .strict();

export function sniffImageType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length > 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function assertUploadSize(size: number): string | null {
  if (size <= 0) return "The file is empty.";
  if (size > maxUploadBytes()) {
    const mb = Math.round(maxUploadBytes() / (1024 * 1024));
    return `This file is larger than the ${mb} MB limit.`;
  }
  return null;
}
