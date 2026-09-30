"use client";

import { useEffect, useReducer } from "react";
import { INITIAL_FEED, feedReducer } from "@/lib/captions/caption-feed";
import { createLocalCaptionChannel } from "@/lib/captions/local-channel";

/** Display screens: listen for caption bubbles from the host laptop. */
export function useCaptionFeed() {
  const [feed, dispatch] = useReducer(feedReducer, INITIAL_FEED);

  useEffect(() => {
    const channel = createLocalCaptionChannel();
    const unsubscribe = channel.subscribe(dispatch);
    channel.send({ type: "hello" });
    return () => {
      unsubscribe();
      channel.close();
    };
  }, []);

  return feed;
}
