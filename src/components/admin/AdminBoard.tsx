"use client";

import { GripVertical } from "lucide-react";
import { useEffect, useState, type DragEvent, type ReactNode } from "react";
import {
  BOARD_STORAGE_KEY,
  movePanel,
  parseBoardLayout,
  type BoardColumn,
  type BoardLayout,
  type BoardPanelId,
} from "@/lib/admin/board-layout";
import type { FestivalState } from "@/lib/realtime/festival-state";
import { AudiencePanel } from "./AudiencePanel";
import { AudioPanel } from "./AudioPanel";
import { DraftsPanel } from "./drafts/DraftsPanel";
import { GardenPanel } from "./garden/GardenPanel";
import { LiveInquiryPanel } from "./LiveInquiryPanel";
import { ScheduleManager } from "./ScheduleManager";
import { TvScreenPanel } from "./TvScreenPanel";

type Props = { state: FestivalState; loaded: boolean };

function persist(layout: BoardLayout) {
  try {
    window.localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* private mode */
  }
}

/** Two-column /admin board: drag panels between columns; Garden always spans full width. */
export function AdminBoard({ state, loaded }: Props) {
  const [layout, setLayout] = useState<BoardLayout>(() => ({
    left: [...parseBoardLayout(null).left],
    right: [...parseBoardLayout(null).right],
  }));
  const [dragging, setDragging] = useState<BoardPanelId | null>(null);
  const day = state.sessions.find((s) => s.id === state.appState.activeSessionId);

  useEffect(() => {
    try {
      setLayout(parseBoardLayout(window.localStorage.getItem(BOARD_STORAGE_KEY)));
    } catch {
      /* keep default */
    }
  }, []);

  function onDrop(column: BoardColumn, index: number) {
    if (!dragging) return;
    setLayout((prev) => {
      const next = movePanel(prev, dragging, column, index);
      persist(next);
      return next;
    });
    setDragging(null);
  }

  const panels: Record<BoardPanelId, ReactNode> = {
    captions: (
      <AudioPanel appState={state.appState} stateLoaded={loaded} daySlug={day?.slug ?? null} />
    ),
    tv: <TvScreenPanel state={state} loaded={loaded} />,
    schedule: <ScheduleManager state={state} loaded={loaded} />,
    drafts: <DraftsPanel appState={state.appState} stateLoaded={loaded} />,
    inquiry: <LiveInquiryPanel state={state} loaded={loaded} />,
    audience: <AudiencePanel appState={state.appState} stateLoaded={loaded} />,
  };

  return (
    <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <Column
        label="Left column"
        column="left"
        ids={layout.left}
        panels={panels}
        dragging={dragging}
        onDragStart={setDragging}
        onDragEnd={() => setDragging(null)}
        onDrop={onDrop}
      />
      <Column
        label="Right column"
        column="right"
        ids={layout.right}
        panels={panels}
        dragging={dragging}
        onDragStart={setDragging}
        onDragEnd={() => setDragging(null)}
        onDrop={onDrop}
      />
      <div className="xl:col-span-2">
        <GardenPanel appState={state.appState} stateLoaded={loaded} />
      </div>
    </div>
  );
}

function Column({
  label,
  column,
  ids,
  panels,
  dragging,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  label: string;
  column: BoardColumn;
  ids: BoardPanelId[];
  panels: Record<BoardPanelId, ReactNode>;
  dragging: BoardPanelId | null;
  onDragStart: (id: BoardPanelId) => void;
  onDragEnd: () => void;
  onDrop: (column: BoardColumn, index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-6" aria-label={label}>
      {ids.map((id, index) => (
        <DraggableSlot
          key={id}
          id={id}
          active={dragging === id}
          onDragStart={() => onDragStart(id)}
          onDragEnd={onDragEnd}
          onDropHere={() => onDrop(column, index)}
        >
          {panels[id]}
        </DraggableSlot>
      ))}
      <DropTail
        active={Boolean(dragging)}
        onDropHere={() => onDrop(column, ids.length)}
      />
    </div>
  );
}

function DraggableSlot({
  id,
  active,
  children,
  onDragStart,
  onDragEnd,
  onDropHere,
}: {
  id: BoardPanelId;
  active: boolean;
  children: ReactNode;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropHere: () => void;
}) {
  function allowDrop(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  return (
    <div
      className={`relative ${active ? "opacity-50" : ""}`}
      onDragOver={allowDrop}
      onDrop={(event) => {
        event.preventDefault();
        onDropHere();
      }}
    >
      <button
        type="button"
        draggable
        aria-label={`Drag to move ${id} panel`}
        title="Drag to reorder or move to the other column"
        className="absolute top-4 left-4 z-10 inline-flex size-9 cursor-grab items-center justify-center rounded-full border border-festival-forest/30 bg-white/80 text-festival-forest active:cursor-grabbing"
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", id);
          event.dataTransfer.effectAllowed = "move";
          onDragStart();
        }}
        onDragEnd={onDragEnd}
      >
        <GripVertical aria-hidden size={18} strokeWidth={1.75} />
      </button>
      <div className="[&>section]:pl-12">{children}</div>
    </div>
  );
}

function DropTail({ active, onDropHere }: { active: boolean; onDropHere: () => void }) {
  if (!active) return null;
  return (
    <div
      className="rounded-3xl border-2 border-dashed border-festival-forest/40 px-4 py-8 text-center text-sm opacity-70"
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDropHere();
      }}
    >
      Drop here
    </div>
  );
}
