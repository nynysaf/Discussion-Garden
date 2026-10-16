"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CaptionColumn } from "@/components/captions/CaptionColumn";
import { StatusPill } from "@/components/StatusPill";
import { visibleBubbles, voicesHeard } from "@/lib/captions/caption-feed";
import { downloadDayTranscript } from "@/lib/captions/transcript-db";
import { Mic, Pause, Play, Square, Download } from "lucide-react";
import { voiceFor } from "@/lib/captions/voice-slot";
import type { AppState } from "@/lib/realtime/app-state";
import { createClient } from "@/lib/supabase/client";
import { errorNotice, input, outlineButton, Panel, primaryButton, warnNotice } from "./ui";
import { useHostCaptions } from "./useHostCaptions";

type Props = {
  appState: AppState;
  stateLoaded: boolean;
  daySlug?: string | null;
};

const ICON = { "aria-hidden": true, size: 18, strokeWidth: 1.5 } as const;

export function AudioPanel({ appState, stateLoaded, daySlug = null }: Props) {
  const host = useHostCaptions(appState, stateLoaded, daySlug);
  const { audioStatus, speakerColoursOn } = host.feed.status;
  const [transcriptBusy, setTranscriptBusy] = useState(false);
  const [transcriptNotice, setTranscriptNotice] = useState<string | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);

  const isActive =
    audioStatus === "live" ||
    audioStatus === "connecting" ||
    audioStatus === "reconnecting";
  const canStart = audioStatus === "idle" || audioStatus === "error";
  const voices = voicesHeard(host.feed).map(voiceFor);

  const confirmStop = () => {
    if (window.confirm("Stop captions and release the microphone?")) host.stop();
  };

  async function downloadTranscript() {
    setTranscriptBusy(true);
    setTranscriptError(null);
    setTranscriptNotice(null);
    try {
      const result = await downloadDayTranscript(
        createClient(),
        appState.activeSessionId,
      );
      setTranscriptNotice(
        result.lineCount === 0
          ? `Downloaded ${result.filename} (no lines yet for this day).`
          : `Downloaded ${result.filename} (${result.lineCount} lines).`,
      );
    } catch (e) {
      setTranscriptError(e instanceof Error ? e.message : "Couldn't download the transcript.");
    } finally {
      setTranscriptBusy(false);
    }
  }

  return (
    <Panel
      id="captions"
      title="Live captions"
      icon={Mic}
      actions={<StatusPill status={audioStatus} className="text-lg" />}
    >
      {host.detail && (
        <p className={`mt-3 ${errorNotice}`} role="alert">
          {host.detail}
        </p>
      )}
      {host.blockedByOtherTab && (
        <p className={`mt-3 ${warnNotice}`} role="alert">
          Captions are already running in another tab of this browser. Use that
          tab, or close it first.
        </p>
      )}
      {host.transcriptBacklog > 0 && (
        <p className={`mt-3 ${warnNotice}`} role="status">
          {host.transcriptBacklog} transcript line
          {host.transcriptBacklog === 1 ? "" : "s"} waiting to save — retrying.
          Captions are unaffected.
        </p>
      )}
      {host.stateSaveError && (
        <p className={`mt-3 ${warnNotice}`} role="status">
          Couldn&apos;t update the TVs&apos; status (Live / Paused). Captions still
          flow; check the connection.
        </p>
      )}
      {host.broadcastError && (
        <p className={`mt-3 ${errorNotice}`} role="alert">
          Captions aren&apos;t reaching the TVs ({host.broadcastError}). Preview
          on this page still works. Try Stop, refresh this page, then Start
          again.
        </p>
      )}
      {host.audioSavedNotice && (
        <p className={`mt-3 ${warnNotice}`} role="status">
          {host.audioSavedNotice}
        </p>
      )}
      {transcriptNotice && (
        <p className={`mt-3 ${warnNotice}`} role="status">
          {transcriptNotice}
        </p>
      )}
      {transcriptError && (
        <p className={`mt-3 ${errorNotice}`} role="alert">
          {transcriptError}
        </p>
      )}
      {stateLoaded && !appState.activeSessionId && (
        <p className={`mt-3 ${warnNotice}`} role="status">
          No festival day selected — the transcript will be saved without a day.
        </p>
      )}

      <div className="mt-5 grid gap-6 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Microphone</span>
            <select
              className={input}
              value={host.deviceId}
              onChange={(e) => host.setDeviceId(e.target.value)}
              disabled={!canStart}
            >
              <option value="">System default</option>
              {host.devices.map((device, i) => (
                <option key={device.deviceId || i} value={device.deviceId}>
                  {device.label || `Microphone ${i + 1}`}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="text-sm font-semibold">Input level</span>
            <div
              className="mt-1 h-3 overflow-hidden rounded-full bg-festival-ink/10"
              role="meter"
              aria-label="Microphone input level"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(host.level * 100)}
            >
              <div
                className="h-full rounded-full bg-festival-forest transition-[width] duration-100"
                style={{ width: `${Math.round(host.level * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <span className="text-sm font-semibold">Voices heard</span>
            <div className="mt-1 flex min-h-8 flex-wrap items-center gap-2">
              {voices.length === 0 ? (
                <span className="text-sm opacity-70">None yet</span>
              ) : (
                voices.map((voice) => (
                  <Image
                    key={voice.animal}
                    src={voice.emojiSrc}
                    alt={voice.animal}
                    title={voice.animal}
                    width={28}
                    height={28}
                    unoptimized
                  />
                ))
              )}
            </div>
            <p className="text-sm opacity-70">
              Mic check: have each person speak a sentence or two — you should
              see one animal per person.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {canStart && (
              <button type="button" className={`${primaryButton} px-5 py-2`} onClick={() => void host.start()}>
                <Mic {...ICON} /> Start captions
              </button>
            )}
            {isActive && (
              <button type="button" className={`${outlineButton} px-5 py-2`} onClick={host.pause}>
                <Pause {...ICON} /> Pause
              </button>
            )}
            {audioStatus === "paused" && (
              <button type="button" className={`${primaryButton} px-5 py-2`} onClick={() => void host.resume()}>
                <Play {...ICON} /> Resume
              </button>
            )}
            {!canStart && (
              <button type="button" className={`${outlineButton} px-5 py-2`} onClick={confirmStop}>
                <Square {...ICON} /> Stop
              </button>
            )}
            <button
              type="button"
              className={`${outlineButton} px-5 py-2`}
              disabled={!stateLoaded || transcriptBusy || !appState.activeSessionId}
              onClick={() => void downloadTranscript()}
            >
              <Download {...ICON} /> Download transcript
            </button>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-5 w-5 accent-festival-forest"
              checked={speakerColoursOn}
              onChange={(e) => host.setSpeakerColours(e.target.checked)}
            />
            <span>
              <span className="font-semibold">Speaker colours &amp; animals</span>
              <span className="block text-sm opacity-70">
                Turn off if voices are being mixed up — bubbles stay one sentence each.
              </span>
            </span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-5 w-5 accent-festival-forest"
              checked={host.voiceCleanup}
              onChange={(e) => host.setVoiceCleanup(e.target.checked)}
              disabled={!canStart}
            />
            <span>
              <span className="font-semibold">Browser voice cleanup</span>
              <span className="block text-sm opacity-70">
                Noise suppression and auto volume. Leave off for better speaker
                separation; try on only in a very noisy room. Applies on Start.
              </span>
            </span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-5 w-5 accent-festival-forest"
              checked={host.saveLocalAudio}
              onChange={(e) => host.setSaveLocalAudio(e.target.checked)}
            />
            <span>
              <span className="font-semibold">Save audio to this laptop</span>
              <span className="block text-sm opacity-70">
                Opt-in. Keeps a WebM copy of the mic on this computer only — never
                uploaded. Downloads on Pause and Stop. Update room signage if you
                use this at the festival.
              </span>
            </span>
          </label>

          <p className="text-sm opacity-70">
            Keep this tab open and in front while live. Pausing closes the
            connection (no Deepgram cost); animals may reshuffle after a pause.
            Open{" "}
            <Link href="/captions" target="_blank" className="underline">
              /captions
            </Link>{" "}
            on any device to see the TV view.
            {host.holdingMic ? " This tab holds the mic." : null}
          </p>
        </div>

        <div className="flex flex-col">
          <span className="text-sm font-semibold">Preview</span>
          <CaptionColumn
            className="mt-1 h-64 rounded-2xl bg-festival-cream p-4 text-lg @3xl:h-96"
            bubbles={visibleBubbles(host.feed, 10)}
            speakerColoursOn={speakerColoursOn}
            emptyMessage="Captions will appear here once you start."
          />
        </div>
      </div>
    </Panel>
  );
}
