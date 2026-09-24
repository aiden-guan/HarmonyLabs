"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { Download, Share2, Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ResultSharePreview } from "@/components/share/result-share-preview";
import { renderResultCard } from "@/lib/share/render-result-card";
import { formatScore } from "@/lib/format";
import type { AnalysisDetail } from "@/lib/data/model";

export interface ResultShareDialogProps {
  analysis: AnalysisDetail;
  isOpen: boolean;
  onClose: () => void;
}

export function ResultShareDialog({
  analysis,
  isOpen,
  onClose,
}: ResultShareDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share results"
      description="Export a high-resolution 4:5 portrait card for social sharing or saving."
      maxWidth="md"
    >
      {isOpen ? <ResultShareDialogContent analysis={analysis} /> : null}
    </Modal>
  );
}

function ResultShareDialogContent({ analysis }: { analysis: AnalysisDetail }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [canShare, setCanShare] = useState(false);

  const activeUrlRef = useRef<string | null>(null);
  const frontPhoto = analysis.photos.find((p) => p.view === "front");
  const displayError = !frontPhoto ? "Front photograph is required to generate a share card." : error;
  const displayLoading = !frontPhoto ? false : loading;

  useEffect(() => {
    if (!frontPhoto) return;

    let isCancelled = false;

    async function generateCard() {
      try {
        const photoRes = await fetch(`/api/analyses/${analysis.id}/photos/front`, {
          credentials: "same-origin",
        });

        if (!photoRes.ok) {
          throw new Error("Could not retrieve front photograph.");
        }

        const photoBlob = await photoRes.blob();
        if (isCancelled) return;

        const img = new Image();
        const objectUrl = URL.createObjectURL(photoBlob);

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Failed to decode photograph."));
          img.src = objectUrl;
        });

        URL.revokeObjectURL(objectUrl);
        if (isCancelled) return;

        const frontLandmarks = analysis.landmarks
          .filter((l) => l.view === "front")
          .map(({ x, y }) => ({ x, y }));

        const generatedBlob = await renderResultCard({
          image: img,
          harmonyScore: analysis.harmonyScore,
          frontScore: analysis.frontScore,
          profileScore: analysis.profileScore,
          landmarks: frontLandmarks,
        });

        if (isCancelled) return;

        const cardUrl = URL.createObjectURL(generatedBlob);
        activeUrlRef.current = cardUrl;
        setBlob(generatedBlob);
        setPreviewUrl(cardUrl);

        // Check Web Share API capability
        if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
          try {
            const testFile = new File([generatedBlob], "HarmonyLabs-result.png", { type: "image/png" });
            if (navigator.canShare && navigator.canShare({ files: [testFile] })) {
              setCanShare(true);
            }
          } catch {
            setCanShare(false);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Failed to generate share card.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void generateCard();

    return () => {
      isCancelled = true;
      if (activeUrlRef.current) {
        URL.revokeObjectURL(activeUrlRef.current);
        activeUrlRef.current = null;
      }
    };
  }, [analysis.id, analysis.harmonyScore, analysis.frontScore, analysis.profileScore, analysis.landmarks, frontPhoto]);

  async function handleShare() {
    if (!blob) return;

    try {
      const file = new File([blob], "HarmonyLabs-result.png", { type: "image/png" });
      await navigator.share({
        files: [file],
        title: "HarmonyLabs Facial Geometry",
        text: `HarmonyLabs Proportional Harmony: ${formatScore(analysis.harmonyScore)} / 10`,
      });
      setShared(true);
      setTimeout(() => setShared(false), 3000);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      handleDownload();
    }
  }

  function handleDownload() {
    if (!previewUrl) return;

    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = "HarmonyLabs-result.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  }

  return (
    <div className="flex flex-col items-center">
      <ResultSharePreview
        previewUrl={previewUrl}
        loading={displayLoading}
        error={displayError}
      />

      {/* Action Controls */}
      <div className="mt-5 flex w-full flex-col sm:flex-row gap-2.5">
        {canShare ? (
          <Button
            className="flex-1"
            onClick={() => void handleShare()}
            disabled={displayLoading || Boolean(displayError) || !blob}
          >
            {shared ? (
              <>
                <Check className="h-4 w-4" />
                Shared
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                Share card
              </>
            )}
          </Button>
        ) : null}

        <Button
          variant={canShare ? "secondary" : "primary"}
          className="flex-1"
          onClick={handleDownload}
          disabled={displayLoading || Boolean(displayError) || !previewUrl}
        >
          {downloaded ? (
            <>
              <Check className="h-4 w-4" />
              Downloaded
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download PNG
            </>
          )}
        </Button>
      </div>

      <p className="mt-3 text-center text-[11px] text-muted">
        Rendered locally on your device. Facial photographs remain private and are not cached publicly.
      </p>
    </div>
  );
}
