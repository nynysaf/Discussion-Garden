import { backoffDelayMs } from "@/lib/audio/backoff";
import { rmsLevel } from "@/lib/audio/level";
import { micConstraints } from "@/lib/audio/mic-constraints";
import { pickRecorderMimeType } from "@/lib/audio/recorder-mime";
import { buildListenUrl } from "@/lib/deepgram/listen-url";
import { parseDeepgramMessage } from "@/lib/deepgram/parse-message";
import { BubbleAccumulator, type BubbleUpdate } from "./bubble-accumulator";
import type { AudioStatus } from "./types";

export type LiveCaptionerOptions = {
  getToken: () => Promise<string>;
  onStatus: (status: AudioStatus, detail?: string) => void;
  onBubbles: (update: BubbleUpdate) => void;
  onLevel?: (level: number) => void;
  listenUrl?: string;
  /** How often MediaRecorder hands audio to the socket. */
  timesliceMs?: number;
};

export function describeMicError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Microphone permission was denied. Allow it in the browser's address bar.";
    }
    if (error.name === "NotFoundError") return "No microphone found.";
    if (error.name === "NotReadableError") {
      return "The microphone is in use by another app.";
    }
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * Browser-only: microphone → Deepgram streaming → speech bubbles.
 * Pause closes the Deepgram connection (no audio, no cost); Resume opens a
 * new one, so speaker numbering — and animals — may reshuffle after a pause.
 */
export class LiveCaptioner {
  private stream: MediaStream | null = null;
  private socket: WebSocket | null = null;
  private recorder: MediaRecorder | null = null;
  private accumulator: BubbleAccumulator | null = null;
  private audioContext: AudioContext | null = null;
  private levelTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  private wantLive = false;

  constructor(private readonly options: LiveCaptionerOptions) {}

  get hasMic(): boolean {
    return this.stream !== null;
  }

  async start(deviceId?: string, voiceCleanup = false): Promise<void> {
    if (this.wantLive) return;
    this.wantLive = true;
    this.options.onStatus("connecting");
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: micConstraints(deviceId, voiceCleanup),
      });
      this.startLevelMeter(this.stream);
      await this.connect();
    } catch (error) {
      this.wantLive = false;
      this.releaseMic();
      this.options.onStatus("error", describeMicError(error));
    }
  }

  async resume(): Promise<void> {
    if (!this.stream) return this.start();
    if (this.wantLive) return;
    this.wantLive = true;
    this.options.onStatus("connecting");
    await this.connect();
  }

  pause(): void {
    this.wantLive = false;
    this.clearReconnect();
    this.closeConnection();
    this.options.onStatus(this.stream ? "paused" : "idle");
  }

  stop(): void {
    this.wantLive = false;
    this.clearReconnect();
    this.closeConnection();
    this.releaseMic();
    this.options.onStatus("idle");
  }

  private async connect(): Promise<void> {
    this.clearReconnect();

    let token: string;
    try {
      token = await this.options.getToken();
    } catch (error) {
      this.scheduleReconnect(describeMicError(error));
      return;
    }
    if (!this.wantLive || !this.stream) return;

    const socket = new WebSocket(
      this.options.listenUrl ?? buildListenUrl(),
      ["bearer", token],
    );
    this.socket = socket;
    this.accumulator = new BubbleAccumulator(crypto.randomUUID());

    socket.onopen = () => {
      if (socket !== this.socket) return;
      this.attempt = 0;
      this.startRecorder(socket);
      this.options.onStatus("live");
    };

    socket.onmessage = (event: MessageEvent) => {
      if (socket !== this.socket || typeof event.data !== "string") return;
      this.handleMessage(event.data);
    };

    socket.onclose = (event: CloseEvent) => {
      if (socket !== this.socket) return;
      this.socket = null;
      this.stopRecorder();
      this.flushAccumulator();
      if (this.wantLive) {
        this.scheduleReconnect(`Connection closed (code ${event.code})`);
      }
    };
  }

  private handleMessage(data: string): void {
    const accumulator = this.accumulator;
    if (!accumulator) return;
    const event = parseDeepgramMessage(data);
    if (event.kind === "results") {
      this.options.onBubbles(accumulator.ingest(event.words, event.isFinal));
    } else if (event.kind === "utterance-end") {
      this.options.onBubbles(accumulator.flushPause());
    }
  }

  private scheduleReconnect(detail: string): void {
    if (!this.wantLive) return;
    this.options.onStatus("reconnecting", detail);
    const delay = backoffDelayMs(this.attempt);
    this.attempt += 1;
    this.reconnectTimer = setTimeout(() => {
      if (this.wantLive) void this.connect();
    }, delay);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private startRecorder(socket: WebSocket): void {
    if (!this.stream) return;
    const mimeType = pickRecorderMimeType((t) => MediaRecorder.isTypeSupported(t));
    const recorder = new MediaRecorder(
      this.stream,
      mimeType ? { mimeType } : undefined,
    );
    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
        socket.send(event.data);
      }
    };
    recorder.start(this.options.timesliceMs ?? 250);
    this.recorder = recorder;
  }

  private stopRecorder(): void {
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.stop();
    }
    this.recorder = null;
  }

  private closeConnection(): void {
    const socket = this.socket;
    this.socket = null;
    this.stopRecorder();
    this.flushAccumulator();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "CloseStream" }));
      socket.close(1000);
    } else if (socket) {
      socket.close();
    }
  }

  private flushAccumulator(): void {
    const accumulator = this.accumulator;
    this.accumulator = null;
    if (accumulator) this.options.onBubbles(accumulator.flushAll());
  }

  private startLevelMeter(stream: MediaStream): void {
    if (!this.options.onLevel) return;
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    context.createMediaStreamSource(stream).connect(analyser);
    const buffer = new Float32Array(analyser.fftSize);
    this.audioContext = context;
    this.levelTimer = setInterval(() => {
      analyser.getFloatTimeDomainData(buffer);
      this.options.onLevel?.(rmsLevel(buffer));
    }, 100);
  }

  private releaseMic(): void {
    if (this.levelTimer) clearInterval(this.levelTimer);
    this.levelTimer = null;
    void this.audioContext?.close();
    this.audioContext = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.options.onLevel?.(0);
  }
}
