"use client";

import { useEffect, useReducer, useState } from "react";
import { INITIAL_FEED, feedReducer } from "@/lib/captions/caption-feed";
import type { Connection } from "@/lib/captions/channel";
import { getCaptionChannel } from "@/lib/captions/shared-channel";
import type { AppState } from "@/lib/realtime/app-state";

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

  return { feed, connection };
}
