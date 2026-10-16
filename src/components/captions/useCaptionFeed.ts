"use client";

import { useEffect, useReducer, useState } from "react";
import { INITIAL_FEED, feedReducer, visibleBubbles } from "@/lib/captions/caption-feed";
import type { Connection } from "@/lib/captions/channel";
import { getCaptionChannel } from "@/lib/captions/shared-channel";
import type { AppState } from "@/lib/realtime/app-state";

const HELLO_RETRY_MS = 4000;

/**
 * Display screens: caption bubbles from the host laptop. Status comes from the
 * broadcast (fast) and from app_state (survives a TV reload or reconnect).
 */
export function useCaptionFeed(appState: AppState, stateLoaded: boolean) {
  const [feed, dispatch] = useReducer(feedReducer, INITIAL_FEED);
  const [connection, setConnection] = useState<Connection>("connecting");

  useEffect(() => {
    const channel = getCaptionChannel();
    const unsubscribe = channel.subscribe(dispatch);
    const stopWatching = channel.onConnection((next) => {
      setConnection(next);
      if (next === "live") channel.send({ type: "hello" });
    });
    return () => {
      unsubscribe();
      stopWatching();
    };
  }, []);

  const { audioStatus, speakerColoursOn } = appState;
  useEffect(() => {
    if (!stateLoaded) return;
    dispatch({ type: "status", status: { audioStatus, speakerColoursOn } });
  }, [stateLoaded, audioStatus, speakerColoursOn]);

  // If the host is Live but we still have no bubbles, ask again — the first
  // hello can land before the host tab is ready to answer.
  const needsCatchUp =
    connection === "live" &&
    audioStatus === "live" &&
    visibleBubbles(feed, 1).length === 0;

  useEffect(() => {
    if (!needsCatchUp) return;
    const channel = getCaptionChannel();
    channel.send({ type: "hello" });
    const timer = setInterval(() => channel.send({ type: "hello" }), HELLO_RETRY_MS);
    return () => clearInterval(timer);
  }, [needsCatchUp]);

  return { feed, connection };
}
