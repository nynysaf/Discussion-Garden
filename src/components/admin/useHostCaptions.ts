"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { acquireControllerLock } from "@/lib/audio/controller-lock";
import { requestScreenWakeLock } from "@/lib/audio/wake-lock";
import { INITIAL_FEED, feedReducer } from "@/lib/captions/caption-feed";
import type { CaptionMessage, CaptionStatus } from "@/lib/captions/channel";
import { LiveCaptioner } from "@/lib/captions/live-captioner";
import { getCaptionChannel } from "@/lib/captions/shared-channel";
import { TranscriptQueue } from "@/lib/captions/transcript-queue";
import { fetchDeepgramToken } from "@/lib/deepgram/fetch-token";
import { toAppStatePatch, type AppState } from "@/lib/realtime/app-state";
import { createClient } from "@/lib/supabase/client";

const SNAPSHOT_GAP_MS = 1000;
const TRANSCRIPT_FLUSH_MS = 3000;

async function listMicrophones(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const all = await navigator.mediaDevices.enumerateDevices();
  return all.filter((d) => d.kind === "audioinput");
}

/** Host laptop: owns the microphone, publishes bubbles, saves the transcript. */
export function useHostCaptions(appState: AppState, stateLoaded: boolean) {
  const [feed, dispatch] = useReducer(feedReducer, INITIAL_FEED);
  const [detail, setDetail] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [voiceCleanup, setVoiceCleanup] = useState(false);
  const [blockedByOtherTab, setBlockedByOtherTab] = useState(false);
  const [transcriptBacklog, setTranscriptBacklog] = useState(0);
  const [stateSaveError, setStateSaveError] = useState(false);

  const feedRef = useRef(feed);
  const statusRef = useRef<CaptionStatus>(INITIAL_FEED.status);
  const sessionIdRef = useRef<string | null>(appState.activeSessionId);
  const captionerRef = useRef<LiveCaptioner | null>(null);
  const releaseLockRef = useRef<(() => void) | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const lastSnapshotRef = useRef(0);
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    feedRef.current = feed;
  }, [feed]);

  useEffect(() => {
    sessionIdRef.current = appState.activeSessionId;
  }, [appState.activeSessionId]);

  // Adopt the saved speaker-colour setting (another host may have changed it).
  useEffect(() => {
    if (!stateLoaded) return;
    statusRef.current = { ...statusRef.current, speakerColoursOn: appState.speakerColoursOn };
    dispatch({ type: "status", status: statusRef.current });
  }, [stateLoaded, appState.speakerColoursOn]);

  const publish = useCallback((message: CaptionMessage) => {
    dispatch(message);
    getCaptionChannel().send(message);
  }, []);

  const saveAppState = useCallback(async (patch: Partial<AppState>) => {
    try {
      const { error } = await createClient()
        .from("app_state")
        .update(toAppStatePatch(patch))
        .eq("id", true);
      setStateSaveError(Boolean(error));
    } catch {
      setStateSaveError(true);
    }
  }, []);

  const publishStatus = useCallback(
    (change: Partial<CaptionStatus>) => {
      statusRef.current = { ...statusRef.current, ...change };
      publish({ type: "status", status: statusRef.current });
      void saveAppState(change);
    },
    [publish, saveAppState],
  );

  const keepAwake = useCallback(async () => {
    if (wakeLockRef.current) return;
    const lock = await requestScreenWakeLock();
    wakeLockRef.current = lock;
    lock?.addEventListener("release", () => {
      if (wakeLockRef.current === lock) wakeLockRef.current = null;
    });
  }, []);

  const refreshDevices = useCallback(async () => {
    setDevices(await listMicrophones());
  }, []);

  useEffect(() => {
    const channel = getCaptionChannel();
    const supabase = createClient();

    const sendSnapshot = () => {
      snapshotTimerRef.current = null;
      lastSnapshotRef.current = Date.now();
      channel.send({
        type: "snapshot",
        recent: feedRef.current.recent,
        live: feedRef.current.live,
        status: statusRef.current,
      });
    };

    const unsubscribe = channel.subscribe((message) => {
      if (message.type !== "hello") return;
      // Only the tab running the mic answers, at most once per second.
      if (!releaseLockRef.current || snapshotTimerRef.current) return;
      const wait = Math.max(0, SNAPSHOT_GAP_MS - (Date.now() - lastSnapshotRef.current));
      snapshotTimerRef.current = setTimeout(sendSnapshot, wait);
    });

    const transcript = new TranscriptQueue(async (rows) => {
      const { error } = await supabase
        .from("transcript_segments")
        .upsert(rows, { onConflict: "bubble_id", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
    });
    const flushTimer = setInterval(() => {
      void transcript.flush().then(() => setTranscriptBacklog(transcript.size));
    }, TRANSCRIPT_FLUSH_MS);

    const captioner = new LiveCaptioner({
      getToken: fetchDeepgramToken,
      onStatus: (audioStatus, info) => {
        setDetail(info ?? null);
        publishStatus({ audioStatus });
      },
      onBubbles: (update) => {
        publish({ type: "bubbles", ...update });
        transcript.enqueue(update.completed, sessionIdRef.current);
      },
      onLevel: setLevel,
    });
    captionerRef.current = captioner;

    void listMicrophones().then(setDevices);
    navigator.mediaDevices?.addEventListener("devicechange", refreshDevices);

    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        statusRef.current.audioStatus === "live"
      ) {
        void keepAwake();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      navigator.mediaDevices?.removeEventListener("devicechange", refreshDevices);
      unsubscribe();
      if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
      captioner.stop();
      clearInterval(flushTimer);
      void transcript.flush();
      releaseLockRef.current?.();
      releaseLockRef.current = null;
      void wakeLockRef.current?.release();
    };
  }, [keepAwake, publish, publishStatus, refreshDevices]);

  const start = useCallback(async () => {
    if (!releaseLockRef.current) {
      const release = await acquireControllerLock();
      if (!release) {
        setBlockedByOtherTab(true);
        return;
      }
      releaseLockRef.current = release;
      setBlockedByOtherTab(false);
    }
    await captionerRef.current?.start(deviceId || undefined, voiceCleanup);
    await refreshDevices();
    await keepAwake();
  }, [deviceId, voiceCleanup, keepAwake, refreshDevices]);

  const pause = useCallback(() => captionerRef.current?.pause(), []);

  const resume = useCallback(async () => {
    await captionerRef.current?.resume();
    await keepAwake();
  }, [keepAwake]);

  const stop = useCallback(() => {
    captionerRef.current?.stop();
    releaseLockRef.current?.();
    releaseLockRef.current = null;
    void wakeLockRef.current?.release();
    wakeLockRef.current = null;
  }, []);

  const setSpeakerColours = useCallback(
    (on: boolean) => publishStatus({ speakerColoursOn: on }),
    [publishStatus],
  );

  return {
    feed,
    detail,
    level,
    devices,
    deviceId,
    setDeviceId,
    voiceCleanup,
    setVoiceCleanup,
    blockedByOtherTab,
    transcriptBacklog,
    stateSaveError,
    start,
    pause,
    resume,
    stop,
    setSpeakerColours,
  };
}
