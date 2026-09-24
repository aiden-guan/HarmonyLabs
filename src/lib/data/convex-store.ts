import "server-only";

import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { SessionUser } from "@/lib/auth/session";
import type { CreateAnalysisInput, PhotoSaveInput, ResultSaveInput, StoredMessage } from "@/lib/data/model";
import type { FaceView, PhotoQuality, SemanticLandmark } from "@/types/face";

async function authed() {
  const token = await convexAuthNextjsToken();
  if (!token) throw new Error("Sign in required.");
  return { token };
}

function isGuest(userId: string): boolean {
  return userId.startsWith("guest_");
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

  async getAnalysis(userId: string, analysisId: string) {
    if (isGuest(userId)) {
      return fetchQuery(api.analyses.get, { analysisId, guestId: userId });
    }
    return fetchQuery(api.analyses.get, { analysisId }, await authed());
  },

  async createAnalysis(userId: string, input: CreateAnalysisInput) {
    const payload = {
      name: input.name,
      isSample: input.isSample,
      adultAcknowledged: input.adultAcknowledged,
      presentationProfile: input.presentationProfile,
      distanceProtocol: input.distanceProtocol,
    };
    if (isGuest(userId)) {
      return fetchMutation(api.analyses.create, {
        ...payload,
        guestId: userId,
      });
    }
    return fetchMutation(api.analyses.create, payload, await authed());
  },

  async claimGuestAnalyses(guestId: string, _authenticatedUserId: string): Promise<number> {
    return fetchMutation(api.analyses.claimGuest, { guestId }, await authed());
  },

  async renameAnalysis(userId: string, analysisId: string, name: string): Promise<void> {
    if (isGuest(userId)) {
      await fetchMutation(api.analyses.rename, { analysisId, name, guestId: userId });
      return;
    }
    await fetchMutation(api.analyses.rename, { analysisId, name }, await authed());
  },

  async deleteAnalysis(userId: string, analysisId: string): Promise<boolean> {
    if (isGuest(userId)) {
      return fetchMutation(api.analyses.remove, { analysisId, guestId: userId });
    }
    return fetchMutation(api.analyses.remove, { analysisId }, await authed());
  },

  async savePhoto(userId: string, analysisId: string, input: PhotoSaveInput) {
    const uploadUrl = isGuest(userId)
      ? await fetchMutation(api.photos.generateUploadUrl, {})
      : await fetchMutation(api.photos.generateUploadUrl, {}, await authed());
    const uploaded = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": input.contentType },
      body: Buffer.from(input.bytes),
    });
    if (!uploaded.ok) return null;
    const body = (await uploaded.json()) as { storageId?: string };
    if (!body.storageId) return null;
    if (isGuest(userId)) {
      return fetchMutation(api.photos.save, {
        analysisId,
        storageId: body.storageId as Id<"_storage">,
        view: input.view,
        contentType: input.contentType,
        width: input.width,
        height: input.height,
        quality: input.quality,
        guestId: userId,
      });
    }
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
      await authed(),
    );
  },

  async updatePhotoQuality(userId: string, analysisId: string, view: FaceView, quality: PhotoQuality) {
    if (!quality) return;
    if (isGuest(userId)) {
      await fetchMutation(api.photos.updateQuality, { analysisId, view, quality, guestId: userId });
      return;
    }
    await fetchMutation(api.photos.updateQuality, { analysisId, view, quality }, await authed());
  },

  async readPhoto(userId: string, analysisId: string, view: FaceView) {
    const photo = isGuest(userId)
      ? await fetchQuery(api.photos.url, { analysisId, view, guestId: userId })
      : await fetchQuery(api.photos.url, { analysisId, view }, await authed());
    if (!photo) return null;
    const response = await fetch(photo.url);
    if (!response.ok) return null;
    return {
      bytes: new Uint8Array(await response.arrayBuffer()),
      contentType: photo.contentType,
    };
  },

  async saveLandmarks(
    userId: string,
    analysisId: string,
    view: FaceView,
    landmarks: SemanticLandmark[],
    options: { detected?: boolean },
  ): Promise<boolean> {
    if (isGuest(userId)) {
      return fetchMutation(api.analyses.saveLandmarks, {
        analysisId,
        view,
        landmarks,
        detected: options.detected,
        guestId: userId,
      });
    }
    return fetchMutation(
      api.analyses.saveLandmarks,
      { analysisId, view, landmarks, detected: options.detected },
      await authed(),
    );
  },

  async saveResults(userId: string, analysisId: string, input: ResultSaveInput): Promise<boolean> {
    if (isGuest(userId)) {
      return fetchMutation(api.analyses.saveResults, {
        analysisId,
        ...input,
        errorMessage: input.errorMessage ?? null,
        guestId: userId,
      });
    }
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
