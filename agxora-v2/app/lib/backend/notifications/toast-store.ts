"use client";

export type ToastTone = "success" | "warning" | "error" | "info";

export type ToastItem = {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  createdAt: number;
  durationMs: number;
};

type Listener = () => void;

const MAX_QUEUE = 5;
let queue: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

function uid() {
  return `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const toastStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): ToastItem[] {
    return queue;
  },
  push(input: {
    tone: ToastTone;
    title: string;
    description?: string;
    durationMs?: number;
  }): string {
    const item: ToastItem = {
      id: uid(),
      tone: input.tone,
      title: input.title,
      description: input.description,
      createdAt: Date.now(),
      durationMs: input.durationMs ?? 4200,
    };
    queue = [...queue, item].slice(-MAX_QUEUE);
    emit();
    if (typeof window !== "undefined") {
      window.setTimeout(() => toastStore.dismiss(item.id), item.durationMs);
    }
    return item.id;
  },
  dismiss(id: string) {
    queue = queue.filter((t) => t.id !== id);
    emit();
  },
  clear() {
    queue = [];
    emit();
  },
  success(title: string, description?: string) {
    return toastStore.push({ tone: "success", title, description });
  },
  warning(title: string, description?: string) {
    return toastStore.push({ tone: "warning", title, description });
  },
  error(title: string, description?: string) {
    return toastStore.push({ tone: "error", title, description });
  },
  info(title: string, description?: string) {
    return toastStore.push({ tone: "info", title, description });
  },
};
