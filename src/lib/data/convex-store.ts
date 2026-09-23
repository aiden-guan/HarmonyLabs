import "server-only";

import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { SessionUser } from "@/lib/auth/session";
import type { PhotoSaveInput, ResultSaveInput, StoredMessage } from "@/lib/data/model";
import type { FaceView, PhotoQuality, SemanticLandmark } from "@/types/face";

async function authed() {
  const token = await convexAuthNextjsToken();
  if (!token) throw new Error("Sign in required.");
  return { token };
}

export const convexStore = {
  async ensureProfile(_user: SessionUser, _displayName?: string | null): Promise<void> {
    await fetchMutation(api.account.ensureProfile, {}, await authed());
  },

  async getProfile(_userId: string) {
    const token = await convexAuthNextjsToken();
    if (!token) return null;
    return fetchQuery(api.account.profile, {}, { token });
  },

  async updateProfile(_userId: string, displayName: string): Promise<void> {
    await fetchMutation(api.account.updateProfile, { displayName }, await authed());
  },

  async deleteUserData(_userId: string): Promise<void> {
    await fetchMutation(api.account.deleteAccount, {}, await authed());
  },

  async listAnalyses(_userId: string) {
    return fetchQuery(api.analyses.list, {}, await authed());
  },

  async getAnalysis(_userId: string, analysisId: string) {
    return fetchQuery(api.analyses.get, { analysisId }, await authed());
  },

  async createAnalysis(_userId: string, input: { name: string; isSample?: boolean }) {
    return fetchMutation(
      api.analyses.create,
      { name: input.name, isSample: input.isSample },
      await authed(),
    );
  },

  async renameAnalysis(_userId: string, analysisId: string, name: string): Promise<void> {
    await fetchMutation(api.analyses.rename, { analysisId, name }, await authed());
  },

  async deleteAnalysis(_userId: string, analysisId: string): Promise<boolean> {
    return fetchMutation(api.analyses.remove, { analysisId }, await authed());
  },

  async savePhoto(_userId: string, analysisId: string, input: PhotoSaveInput) {
    const options = await authed();
    const uploadUrl = await fetchMutation(api.photos.generateUploadUrl, {}, options);
    const uploaded = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": input.contentType },
      body: Buffer.from(input.bytes),
    });
    if (!uploaded.ok) return null;
    const body = (await uploaded.json()) as { storageId?: string };
    if (!body.storageId) return null;
    return fetchMutation(
      api.photos.save,
      {
        analysisId,
        storageId: body.storageId as Id<"_storage">,
        view: input.view,
        contentType: input.contentType,
        width: input.width,
        height: input.height,
        quality: input.quality,
      },
      options,
    );
  },

  async updatePhotoQuality(_userId: string, analysisId: string, view: FaceView, quality: PhotoQuality) {
    if (!quality) return;
    await fetchMutation(api.photos.updateQuality, { analysisId, view, quality }, await authed());
  },

  async readPhoto(_userId: string, analysisId: string, view: FaceView) {
    const photo = await fetchQuery(api.photos.url, { analysisId, view }, await authed());
    if (!photo) return null;
    const response = await fetch(photo.url);
    if (!response.ok) return null;
    return {
      bytes: new Uint8Array(await response.arrayBuffer()),
      contentType: photo.contentType,
    };
  },

  async saveLandmarks(
    _userId: string,
    analysisId: string,
    view: FaceView,
    landmarks: SemanticLandmark[],
    options: { detected?: boolean },
  ): Promise<boolean> {
    return fetchMutation(
      api.analyses.saveLandmarks,
      { analysisId, view, landmarks, detected: options.detected },
      await authed(),
    );
  },

  async saveResults(_userId: string, analysisId: string, input: ResultSaveInput): Promise<boolean> {
    return fetchMutation(api.analyses.saveResults, { analysisId, ...input, errorMessage: input.errorMessage ?? null }, await authed());
  },

  async addExchange(
    _userId: string,
    analysisId: string,
    userContent: string,
    assistantContent: string,
    structured: unknown,
  ): Promise<StoredMessage[] | null> {
    return fetchMutation(
      api.analyses.addExchange,
      { analysisId, userContent, assistantContent, structured },
      await authed(),
    );
  },
};
