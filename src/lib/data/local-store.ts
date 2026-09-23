import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CategoryScore } from "@/lib/face/scoring/aggregate";
import type {
  AnalysisDetail,
  CreateAnalysisInput,
  PhotoSaveInput,
  ResultSaveInput,
  StoredLandmark,
  StoredMessage,
  StoredMetric,
} from "@/lib/data/model";
import type { SessionUser } from "@/lib/auth/session";
import type { AnalysisSummary } from "@/types/analysis";
import type { FaceView, PhotoQuality, SemanticLandmark } from "@/types/face";

interface LocalProfile {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
}

interface LocalAnalysis {
  id: string;
  userId: string;
  name: string;
  status: AnalysisDetail["status"];
  isSample: boolean;
  harmonyScore: number | null;
  frontScore: number | null;
  profileScore: number | null;
  categoryScores: CategoryScore[];
  qualityNotes: string[];
  confidence: AnalysisDetail["confidence"];
  profileMirrored: boolean;
  errorMessage: string | null;
  detectedLandmarks: Partial<Record<FaceView, SemanticLandmark[]>>;
  createdAt: string;
  updatedAt: string;
}

interface LocalPhoto {
  id: string;
  analysisId: string;
  userId: string;
  view: FaceView;
  storagePath: string;
  contentType: string;
  width: number;
  height: number;
  quality: PhotoQuality;
  createdAt: string;
}

interface LocalDb {
  profiles: LocalProfile[];
  analyses: LocalAnalysis[];
  photos: LocalPhoto[];
  landmarks: Array<StoredLandmark & { id: string; analysisId: string; updatedAt: string }>;
  metrics: Array<StoredMetric & { id: string; analysisId: string; createdAt: string }>;
  threads: Array<{ id: string; analysisId: string; userId: string; createdAt: string }>;
  messages: Array<StoredMessage & { threadId: string }>;
}

const emptyQuality = (): PhotoQuality => ({
  faceDetected: false,
  faceCount: 0,
  yaw: null,
  pitch: null,
  roll: null,
  blurScore: 0,
  brightnessScore: 0,
  faceCoverage: 0,
  warnings: [],
  mirrored: false,
});

function dataDir(): string {
  return process.env.FACELAB_DATA_DIR || path.join(process.cwd(), ".data");
}

function dbPath(): string {
  return path.join(dataDir(), "store.json");
}

let queue: Promise<unknown> = Promise.resolve();

function emptyDb(): LocalDb {
  return {
    profiles: [],
    analyses: [],
    photos: [],
    landmarks: [],
    metrics: [],
    threads: [],
    messages: [],
  };
}

let cachedDb: LocalDb | null = null;

async function readDb(): Promise<LocalDb> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const raw = await readFile(dbPath(), "utf8");
      const parsed = { ...emptyDb(), ...JSON.parse(raw) } as LocalDb;
      cachedDb = parsed;
      return parsed;
    } catch (err: unknown) {
      const nodeErr = err as { code?: string };
      if (nodeErr?.code === "ENOENT" && attempt === 0 && !cachedDb) {
        return emptyDb();
      }
      if (attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        continue;
      }
      if (cachedDb) return cachedDb;
      return emptyDb();
    }
  }
  return cachedDb ?? emptyDb();
}

async function writeDb(db: LocalDb): Promise<void> {
  const dir = dataDir();
  await mkdir(dir, { recursive: true });
  const temp = path.join(dir, `store.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
  await writeFile(temp, JSON.stringify(db));
  await rename(temp, dbPath());
}

function locked<T>(work: (db: LocalDb) => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const diskDb = await readDb();
    let db = diskDb;
    if (cachedDb && cachedDb.analyses.length > diskDb.analyses.length) {
      db = cachedDb;
    }
    const result = await work(db);
    cachedDb = db;
    await writeDb(db);
    return result;
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function summary(analysis: LocalAnalysis): AnalysisSummary {
  return {
    id: analysis.id,
    name: analysis.name,
    status: analysis.status,
    isSample: analysis.isSample,
    harmonyScore: analysis.harmonyScore,
    frontScore: analysis.frontScore,
    profileScore: analysis.profileScore,
    createdAt: analysis.createdAt,
    updatedAt: analysis.updatedAt,
  };
}

function detail(db: LocalDb, analysis: LocalAnalysis): AnalysisDetail {
  const thread = db.threads.find((item) => item.analysisId === analysis.id);
  return {
    ...summary(analysis),
    profileMirrored: analysis.profileMirrored,
    categoryScores: analysis.categoryScores,
    qualityNotes: analysis.qualityNotes,
    confidence: analysis.confidence,
    errorMessage: analysis.errorMessage,
    detectedLandmarks: analysis.detectedLandmarks,
    photos: db.photos
      .filter((photo) => photo.analysisId === analysis.id)
      .map((photo) => ({
        id: photo.id,
        view: photo.view,
        contentType: photo.contentType,
        width: photo.width,
        height: photo.height,
        quality: photo.quality,
      })),
    landmarks: db.landmarks
      .filter((landmark) => landmark.analysisId === analysis.id)
      .map(({ id: _id, analysisId: _analysisId, updatedAt: _updatedAt, ...landmark }) => landmark),
    metrics: db.metrics
      .filter((metric) => metric.analysisId === analysis.id)
      .map(({ id: _id, analysisId: _analysisId, createdAt: _createdAt, ...metric }) => metric),
    messages: thread
      ? db.messages
          .filter((message) => message.threadId === thread.id)
          .map(({ threadId: _threadId, ...message }) => message)
      : [],
  };
}

function owned(db: LocalDb, userId: string, analysisId: string): LocalAnalysis | null {
  return db.analyses.find((item) => item.id === analysisId && item.userId === userId) ?? null;
}

export const localStore = {
  async ensureProfile(user: SessionUser, displayName?: string | null): Promise<void> {
    await locked(async (db) => {
      const existing = db.profiles.find((profile) => profile.id === user.id);
      if (existing) {
        existing.email = user.email;
        return;
      }
      db.profiles.push({
        id: user.id,
        email: user.email,
        displayName: displayName ?? user.email.split("@")[0] ?? "Member",
        createdAt: new Date().toISOString(),
      });
    });
  },

  async getProfile(userId: string) {
    const db = await readDb();
    return db.profiles.find((profile) => profile.id === userId) ?? null;
  },

  async updateProfile(userId: string, displayName: string): Promise<void> {
    await locked(async (db) => {
      const profile = db.profiles.find((item) => item.id === userId);
      if (profile) profile.displayName = displayName;
    });
  },

  async deleteUserData(userId: string): Promise<void> {
    await locked(async (db) => {
      const ids = new Set(db.analyses.filter((item) => item.userId === userId).map((item) => item.id));
      const threadIds = new Set(
        db.threads.filter((thread) => thread.userId === userId).map((thread) => thread.id),
      );
      for (const photo of db.photos.filter((item) => item.userId === userId)) {
        await removePhotoFile(photo.storagePath);
      }
      db.profiles = db.profiles.filter((item) => item.id !== userId);
      db.analyses = db.analyses.filter((item) => item.userId !== userId);
      db.photos = db.photos.filter((item) => item.userId !== userId);
      db.landmarks = db.landmarks.filter((item) => !ids.has(item.analysisId));
      db.metrics = db.metrics.filter((item) => !ids.has(item.analysisId));
      db.threads = db.threads.filter((item) => item.userId !== userId);
      db.messages = db.messages.filter((item) => !threadIds.has(item.threadId));
    });
  },

  async listAnalyses(userId: string): Promise<AnalysisSummary[]> {
    const db = await readDb();
    return db.analyses
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(summary);
  },

  async getAnalysis(userId: string, analysisId: string): Promise<AnalysisDetail | null> {
    const db = await readDb();
    const analysis = owned(db, userId, analysisId);
    return analysis ? detail(db, analysis) : null;
  },

  async createAnalysis(userId: string, input: CreateAnalysisInput): Promise<AnalysisSummary> {
    return locked(async (db) => {
      const now = new Date().toISOString();
      const analysis: LocalAnalysis = {
        id: crypto.randomUUID(),
        userId,
        name: input.name,
        status: "draft",
        isSample: Boolean(input.isSample),
        harmonyScore: null,
        frontScore: null,
        profileScore: null,
        categoryScores: [],
        qualityNotes: [],
        confidence: null,
        profileMirrored: false,
        errorMessage: null,
        detectedLandmarks: {},
        createdAt: now,
        updatedAt: now,
      };
      db.analyses.push(analysis);
      return summary(analysis);
    });
  },

  async renameAnalysis(userId: string, analysisId: string, name: string): Promise<void> {
    await locked(async (db) => {
      const analysis = owned(db, userId, analysisId);
      if (!analysis) return;
      analysis.name = name;
      analysis.updatedAt = new Date().toISOString();
    });
  },

  async deleteAnalysis(userId: string, analysisId: string): Promise<boolean> {
    return locked(async (db) => {
      const analysis = owned(db, userId, analysisId);
      if (!analysis) return false;
      for (const photo of db.photos.filter((item) => item.analysisId === analysisId)) {
        await removePhotoFile(photo.storagePath);
      }
      const threadIds = new Set(
        db.threads.filter((thread) => thread.analysisId === analysisId).map((thread) => thread.id),
      );
      db.analyses = db.analyses.filter((item) => item.id !== analysisId);
      db.photos = db.photos.filter((item) => item.analysisId !== analysisId);
      db.landmarks = db.landmarks.filter((item) => item.analysisId !== analysisId);
      db.metrics = db.metrics.filter((item) => item.analysisId !== analysisId);
      db.threads = db.threads.filter((item) => item.analysisId !== analysisId);
      db.messages = db.messages.filter((item) => !threadIds.has(item.threadId));
      return true;
    });
  },

  async savePhoto(userId: string, analysisId: string, input: PhotoSaveInput) {
    const extension = input.contentType === "image/png" ? "png" : input.contentType === "image/webp" ? "webp" : "jpg";
    const fileName = `${input.view}.${extension}`;
    if (userId.includes("/") || userId.includes("\\") || analysisId.includes("/") || analysisId.includes("\\")) {
      return null;
    }
    const storagePath = `${userId}/${analysisId}/${fileName}`;
    return locked(async (db) => {
      const analysis = owned(db, userId, analysisId);
      if (!analysis) return null;
      await mkdir(path.dirname(path.join(/*turbopackIgnore: true*/ dataDir(), "photos", storagePath)), { recursive: true });
      await writeFile(path.join(/*turbopackIgnore: true*/ dataDir(), "photos", storagePath), input.bytes);
      db.photos = db.photos.filter((photo) => !(photo.analysisId === analysisId && photo.view === input.view));
      const photo: LocalPhoto = {
        id: crypto.randomUUID(),
        analysisId,
        userId,
        view: input.view,
        storagePath,
        contentType: input.contentType,
        width: input.width,
        height: input.height,
        quality: input.quality ?? emptyQuality(),
        createdAt: new Date().toISOString(),
      };
      db.photos.push(photo);
      const views = new Set(db.photos.filter((item) => item.analysisId === analysisId).map((item) => item.view));
      if (views.has("front") && views.has("profile") && analysis.status === "draft") {
        analysis.status = "photos_uploaded";
      }
      analysis.updatedAt = new Date().toISOString();
      return {
        id: photo.id,
        view: photo.view,
        contentType: photo.contentType,
        width: photo.width,
        height: photo.height,
        quality: photo.quality,
      };
    });
  },

  async updatePhotoQuality(userId: string, analysisId: string, view: FaceView, quality: PhotoQuality) {
    await locked(async (db) => {
      if (!owned(db, userId, analysisId)) return;
      const photo = db.photos.find((item) => item.analysisId === analysisId && item.view === view);
      if (photo) photo.quality = quality;
      if (view === "profile") {
        const analysis = owned(db, userId, analysisId);
        if (analysis) analysis.profileMirrored = quality.mirrored;
      }
    });
  },

  async readPhoto(userId: string, analysisId: string, view: FaceView) {
    const db = await readDb();
    if (!owned(db, userId, analysisId)) return null;
    const photo = db.photos.find((item) => item.analysisId === analysisId && item.view === view);
    if (!photo || !photo.storagePath.startsWith(`${userId}${path.sep}`) && !photo.storagePath.startsWith(`${userId}/`)) {
      return null;
    }
    try {
      const bytes = await readFile(path.join(/*turbopackIgnore: true*/ dataDir(), "photos", photo.storagePath));
      return { bytes, contentType: photo.contentType };
    } catch {
      return null;
    }
  },

  async saveLandmarks(
    userId: string,
    analysisId: string,
    view: FaceView,
    landmarks: SemanticLandmark[],
    options: { detected?: boolean },
  ): Promise<boolean> {
    return locked(async (db) => {
      const analysis = owned(db, userId, analysisId);
      if (!analysis) return false;
      const now = new Date().toISOString();
      db.landmarks = db.landmarks.filter((item) => !(item.analysisId === analysisId && item.view === view));
      for (const landmark of landmarks) {
        db.landmarks.push({
          id: crypto.randomUUID(),
          analysisId,
          view,
          key: landmark.key,
          x: landmark.x,
          y: landmark.y,
          z: landmark.z,
          confidence: landmark.confidence,
          source: landmark.source,
          updatedAt: now,
        });
      }
      if (options.detected) {
        analysis.detectedLandmarks = { ...analysis.detectedLandmarks, [view]: landmarks };
      }
      const views = new Set(db.landmarks.filter((item) => item.analysisId === analysisId).map((item) => item.view));
      if (views.has("front") && views.has("profile")) analysis.status = "awaiting_verification";
      else analysis.status = "landmarks_detected";
      analysis.updatedAt = now;
      return true;
    });
  },

  async saveResults(userId: string, analysisId: string, input: ResultSaveInput): Promise<boolean> {
    return locked(async (db) => {
      const analysis = owned(db, userId, analysisId);
      if (!analysis) return false;
      const now = new Date().toISOString();
      analysis.status = input.status;
      analysis.harmonyScore = input.harmonyScore;
      analysis.frontScore = input.frontScore;
      analysis.profileScore = input.profileScore;
      analysis.categoryScores = input.categoryScores;
      analysis.qualityNotes = input.qualityNotes;
      analysis.confidence = input.confidence;
      analysis.errorMessage = input.errorMessage ?? null;
      analysis.updatedAt = now;
      db.metrics = db.metrics.filter((metric) => metric.analysisId !== analysisId);
      for (const metric of input.metrics) {
        db.metrics.push({ ...metric, id: crypto.randomUUID(), analysisId, createdAt: now });
      }
      return true;
    });
  },

  async addExchange(
    userId: string,
    analysisId: string,
    userContent: string,
    assistantContent: string,
    structured: unknown,
  ): Promise<StoredMessage[] | null> {
    return locked(async (db) => {
      if (!owned(db, userId, analysisId)) return null;
      let thread = db.threads.find((item) => item.analysisId === analysisId && item.userId === userId);
      if (!thread) {
        thread = {
          id: crypto.randomUUID(),
          analysisId,
          userId,
          createdAt: new Date().toISOString(),
        };
        db.threads.push(thread);
      }
      const now = Date.now();
      const userMessage: StoredMessage & { threadId: string } = {
        id: crypto.randomUUID(),
        threadId: thread.id,
        role: "user",
        content: userContent,
        createdAt: new Date(now).toISOString(),
      };
      const assistantMessage: StoredMessage & { threadId: string } = {
        id: crypto.randomUUID(),
        threadId: thread.id,
        role: "assistant",
        content: assistantContent,
        structuredData: structured,
        createdAt: new Date(now + 1).toISOString(),
      };
      db.messages.push(userMessage, assistantMessage);
      return [userMessage, assistantMessage].map(({ threadId: _threadId, ...message }) => message);
    });
  },
};

async function removePhotoFile(storagePath: string): Promise<void> {
  const { rm } = await import("node:fs/promises");
  await rm(path.join(/*turbopackIgnore: true*/ dataDir(), "photos", storagePath), { force: true });
}
