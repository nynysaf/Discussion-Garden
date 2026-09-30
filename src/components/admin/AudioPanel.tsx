"use client";

import Image from "next/image";
import Link from "next/link";
import { CaptionColumn } from "@/components/captions/CaptionColumn";
import { StatusPill } from "@/components/StatusPill";
import { visibleBubbles, voicesHeard } from "@/lib/captions/caption-feed";
import { voiceFor } from "@/lib/captions/voice-slot";
import { useHostCaptions } from "./useHostCaptions";

const primaryButton =
  "rounded-full bg-festival-forest px-5 py-2 font-semibold text-festival-cream transition hover:brightness-110 disabled:opacity-40";
const secondaryButton =
  "rounded-full border border-festival-forest px-5 py-2 font-semibold text-festival-forest transition hover:bg-festival-forest/10 disabled:opacity-40";

export function AudioPanel() {
  const host = useHostCaptions();
  const { audioStatus, speakerColoursOn } = host.feed.status;

  const isActive =
    audioStatus === "live" ||
    audioStatus === "connecting" ||
    audioStatus === "reconnecting";
  const canStart = audioStatus === "idle" || audioStatus === "error";
  const voices = voicesHeard(host.feed).map(voiceFor);

  const confirmStop = () => {
    if (window.confirm("Stop captions and release the microphone?")) host.stop();
  };

  return (
    <section className="rounded-3xl bg-white/60 p-6 shadow-poster">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-3xl font-semibold">Live captions</h2>
        <StatusPill status={audioStatus} className="text-lg" />
      </div>

      {host.detail && (
        <p className="mt-3 rounded-xl bg-festival-terracotta/15 px-4 py-2" role="alert">
          {host.detail}
        </p>
      )}
      {host.blockedByOtherTab && (
        <p className="mt-3 rounded-xl bg-festival-marigold/25 px-4 py-2" role="alert">
          Captions are already running in another tab of this browser. Use that
          tab, or close it first.
        </p>
      )}

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Microphone</span>
            <select
              className="rounded-xl border border-festival-ink/20 bg-festival-cream px-3 py-2"
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
              <button type="button" className={primaryButton} onClick={() => void host.start()}>
                Start captions
              </button>
            )}
            {isActive && (
              <button type="button" className={secondaryButton} onClick={host.pause}>
                Pause
              </button>
            )}
            {audioStatus === "paused" && (
              <button type="button" className={primaryButton} onClick={() => void host.resume()}>
                Resume
              </button>
            )}
            {!canStart && (
              <button type="button" className={secondaryButton} onClick={confirmStop}>
                Stop
              </button>
            )}
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

          <p className="text-sm opacity-70">
            Keep this tab open and in front while live. Pausing closes the
            connection (no Deepgram cost); animals may reshuffle after a pause.
            Open{" "}
            <Link href="/captions" target="_blank" className="underline">
              /captions
            </Link>{" "}
            in another tab of this browser to see the TV view.
          </p>
        </div>

        <div className="flex flex-col">
          <span className="text-sm font-semibold">Preview</span>
          <CaptionColumn
            className="mt-1 h-96 rounded-2xl bg-festival-cream p-4 text-lg"
            bubbles={visibleBubbles(host.feed, 10)}
            speakerColoursOn={speakerColoursOn}
            emptyMessage="Captions will appear here once you start."
          />
        </div>
      </div>
    </section>
  );
}
