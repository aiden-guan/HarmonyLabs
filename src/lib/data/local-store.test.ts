import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";
import type { SessionUser } from "@/lib/auth/session";

let directory = "";

beforeAll(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "facelab-store-"));
  process.env.FACELAB_DATA_DIR = directory;
});

afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
});

test("one account cannot read another account's analysis or photo", async () => {
  const { localStore } = await import("@/lib/data/local-store");
  const alice: SessionUser = { id: "alice-user", email: "alice@example.com" };
  const blake: SessionUser = { id: "blake-user", email: "blake@example.com" };
  await localStore.ensureProfile(alice);
  await localStore.ensureProfile(blake);
  const analysis = await localStore.createAnalysis(alice.id, { name: "Alice only" });
  await localStore.savePhoto(alice.id, analysis.id, {
    view: "front",
    bytes: Uint8Array.from([1, 2, 3, 4]),
    contentType: "image/jpeg",
    width: 80,
    height: 80,
  });

  expect(await localStore.getAnalysis(blake.id, analysis.id)).toBeNull();
  expect(await localStore.readPhoto(blake.id, analysis.id, "front")).toBeNull();
  expect(await localStore.listAnalyses(blake.id)).toHaveLength(0);
  const owned = await localStore.readPhoto(alice.id, analysis.id, "front");
  expect(Array.from(owned?.bytes ?? [])).toEqual([1, 2, 3, 4]);
});

test("guest analysis can be created and is claimed upon account sign-in", async () => {
  const { localStore } = await import("@/lib/data/local-store");
  const guestId = "guest_test_12345";
  const user: SessionUser = { id: "charlie-user", email: "charlie@example.com" };
  await localStore.ensureProfile(user);

  // Guest creates analysis and saves a photo
  const analysis = await localStore.createAnalysis(guestId, { name: "Guest analysis" });
  await localStore.savePhoto(guestId, analysis.id, {
    view: "front",
    bytes: Uint8Array.from([10, 20, 30, 40]),
    contentType: "image/jpeg",
    width: 100,
    height: 100,
  });

  // Charlie cannot read it yet
  expect(await localStore.getAnalysis(user.id, analysis.id)).toBeNull();
  expect(await localStore.readPhoto(user.id, analysis.id, "front")).toBeNull();

  // Guest can read it while in guest session
  expect(await localStore.getAnalysis(guestId, analysis.id)).not.toBeNull();
  const guestPhoto = await localStore.readPhoto(guestId, analysis.id, "front");
  expect(Array.from(guestPhoto?.bytes ?? [])).toEqual([10, 20, 30, 40]);

  // Charlie signs in / claims guest analysis
  const claimedCount = await localStore.claimGuestAnalyses(guestId, user.id);
  expect(claimedCount).toBe(1);

  // Charlie now owns it!
  const claimedAnalysis = await localStore.getAnalysis(user.id, analysis.id);
  expect(claimedAnalysis).not.toBeNull();
  expect(claimedAnalysis?.name).toBe("Guest analysis");
  const claimedPhoto = await localStore.readPhoto(user.id, analysis.id, "front");
  expect(Array.from(claimedPhoto?.bytes ?? [])).toEqual([10, 20, 30, 40]);

  // Guest id can no longer access it
  expect(await localStore.getAnalysis(guestId, analysis.id)).toBeNull();
  expect(await localStore.readPhoto(guestId, analysis.id, "front")).toBeNull();
});

