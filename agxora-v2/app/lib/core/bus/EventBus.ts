/**
 * Global Event Bus — modules communicate without direct dependencies.
 */

import type { CoreEvent, EventHandler, Unsubscribe } from "../types";

type AnyHandler = EventHandler<unknown>;

export interface EventBus {
  publish<TPayload = unknown>(event: CoreEvent<TPayload>): void;
  subscribe<TPayload = unknown>(
    type: string,
    handler: EventHandler<TPayload>,
  ): Unsubscribe;
  subscribeAll(handler: EventHandler): Unsubscribe;
  once<TPayload = unknown>(
    type: string,
    handler: EventHandler<TPayload>,
  ): Unsubscribe;
  clear(): void;
}

export function createEventBus(): EventBus {
  const typed = new Map<string, Set<AnyHandler>>();
  const global = new Set<AnyHandler>();

  const publish: EventBus["publish"] = (event) => {
    const handlers = typed.get(event.type);
    if (handlers) {
      for (const handler of [...handlers]) {
        handler(event as CoreEvent<unknown>);
      }
    }
    for (const handler of [...global]) {
      handler(event as CoreEvent<unknown>);
    }
  };

  const subscribe: EventBus["subscribe"] = (type, handler) => {
    let set = typed.get(type);
    if (!set) {
      set = new Set();
      typed.set(type, set);
    }
    const wrapped = handler as AnyHandler;
    set.add(wrapped);
    return () => {
      set?.delete(wrapped);
      if (set && set.size === 0) typed.delete(type);
    };
  };

  const subscribeAll: EventBus["subscribeAll"] = (handler) => {
    const wrapped = handler as AnyHandler;
    global.add(wrapped);
    return () => {
      global.delete(wrapped);
    };
  };

  const once: EventBus["once"] = (type, handler) => {
    const unsub = subscribe<unknown>(type, (event) => {
      unsub();
      (handler as EventHandler<unknown>)(event);
    });
    return unsub;
  };

  const clear = (): void => {
    typed.clear();
    global.clear();
  };

  return { publish, subscribe, subscribeAll, once, clear };
}

/** Canonical core event type strings (extend via modules). */
export const CoreEvents = {
  ENGINE_READY: "core.engine.ready",
  MODULE_REGISTERED: "core.module.registered",
  MODULE_ACTIVATED: "core.module.activated",
  MODULE_DEACTIVATED: "core.module.deactivated",
  NAVIGATION_CHANGED: "core.navigation.changed",
  SETTINGS_CHANGED: "core.settings.changed",
  WORKSPACE_CHANGED: "core.workspace.changed",
  PERMISSION_CHANGED: "core.permission.changed",
  FEATURE_FLAG_CHANGED: "core.feature_flag.changed",
  CONFIG_CHANGED: "core.config.changed",
  NOTIFICATION_CREATED: "core.notification.created",
  NOTIFICATION_READ: "core.notification.read",
  EXTENSION_REGISTERED: "core.extension.registered",
  PLUGIN_LIFECYCLE: "core.plugin.lifecycle",
  MEMORY_WRITTEN: "core.memory.written",
  CHAT_MESSAGE_SENT: "core.chat.message.sent",
  CHAT_CONVERSATION_CREATED: "core.chat.conversation.created",
} as const;
