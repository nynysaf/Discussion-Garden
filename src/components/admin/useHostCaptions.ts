"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { acquireControllerLock } from "@/lib/audio/controller-lock";
import { requestScreenWakeLock } from "@/lib/audio/wake-lock";
import { INITIAL_FEED, feedReducer } from "@/lib/captions/caption-feed";
import type {
  CaptionChannel,
  CaptionMessage,
  CaptionStatus,
} from "@/lib/captions/channel";
import { LiveCaptioner } from "@/lib/captions/live-captioner";
import { createLocalCaptionChannel } from "@/lib/captions/local-channel";
import { fetchDeepgramToken } from "@/lib/deepgram/fetch-token";

async function listMicrophones(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const all = await navigator.mediaDevices.enumerateDevices();
  return all.filter((d) => d.kind === "audioinput");
}

/** Host laptop: owns the microphone and publishes caption bubbles. */
export function useHostCaptions() {
  const [feed, dispatch] = useReducer(feedReducer, INITIAL_FEED);
  const [detail, setDetail] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [voiceCleanup, setVoiceCleanup] = useState(false);
  const [blockedByOtherTab, setBlockedByOtherTab] = useState(false);

  const feedRef = useRef(feed);
  const statusRef = useRef<CaptionStatus>(INITIAL_FEED.status);
  const channelRef = useRef<CaptionChannel | null>(null);
  const captionerRef = useRef<LiveCaptioner | null>(null);
  const releaseLockRef = useRef<(() => void) | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    feedRef.current = feed;
  }, [feed]);

  const publish = useCallback((message: CaptionMessage) => {
    dispatch(message);
    channelRef.current?.send(message);
  }, []);

  const publishStatus = useCallback(
    (change: Partial<CaptionStatus>) => {
      statusRef.current = { ...statusRef.current, ...change };
      publish({ type: "status", status: statusRef.current });
    },
    [publish],
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
    const channel = createLocalCaptionChannel();
    channelRef.current = channel;
    const unsubscribe = channel.subscribe((message) => {
      if (message.type !== "hello") return;
      channel.send({
        type: "snapshot",
        recent: feedRef.current.recent,
        live: feedRef.current.live,
        status: statusRef.current,
      });
    });

    const captioner = new LiveCaptioner({
      getToken: fetchDeepgramToken,
      onStatus: (audioStatus, info) => {
        setDetail(info ?? null);
        publishStatus({ audioStatus });
      },
      onBubbles: (update) => publish({ type: "bubbles", ...update }),
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
      captioner.stop();
      releaseLockRef.current?.();
      releaseLockRef.current = null;
      void wakeLockRef.current?.release();
      channel.close();
      channelRef.current = null;
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
    start,
    pause,
    resume,
    stop,
    setSpeakerColours,
  };
}
