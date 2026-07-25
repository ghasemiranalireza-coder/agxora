/**
 * Automatic discovery / registration of builtin universal modules.
 */

import { asExtensionId, asPermissionId } from "../ids";
import type { CoreEngine } from "../engine/CoreEngine";
import { CoreEvents } from "../bus/EventBus";
import { createBuiltinAppDescriptors, createBuiltinModuleManifests } from "./catalog";

export function registerBuiltinModules(engine: CoreEngine): void {
  const manifests = createBuiltinModuleManifests();
  const apps = createBuiltinAppDescriptors(manifests);

  for (const manifest of manifests) {
    engine.modules.register(manifest);
    engine.navigation.register(manifest.id, manifest.navigation);
    engine.settings.define(manifest.settings);
    engine.permissions.define(
      manifest.permissions.map((permissionId) => ({
        id: permissionId,
        moduleId: manifest.id,
        action: String(permissionId).split(".")[1] ?? "use",
        resource: String(permissionId).split(".")[2] ?? "module",
        description: `${manifest.name} permission`,
      })),
    );

    engine.extensions.contribute({
      id: asExtensionId(`ext.${manifest.id}.nav`),
      point: "navigation",
      moduleId: manifest.id,
      enabled: manifest.status === "active",
      payload: { items: manifest.navigation },
    });

    engine.events.publish({
      type: CoreEvents.MODULE_REGISTERED,
      source: "core.modules",
      timestamp: new Date().toISOString(),
      payload: { moduleId: manifest.id, version: manifest.version },
    });

    if (manifest.status === "active") {
      engine.events.publish({
        type: CoreEvents.MODULE_ACTIVATED,
        source: "core.modules",
        timestamp: new Date().toISOString(),
        payload: { moduleId: manifest.id },
      });
    }
  }

  for (const app of apps) {
    engine.apps.register(app);
  }

  // Bootstrap subject grant for core + chat (local foundation).
  const subjectId = "local-user";
  for (const manifest of manifests.filter((m) => m.status === "active")) {
    for (const permissionId of manifest.permissions) {
      engine.permissions.grant({
        permissionId: asPermissionId(permissionId),
        subjectId,
        effect: "allow",
      });
    }
  }

  engine.events.publish({
    type: CoreEvents.NAVIGATION_CHANGED,
    source: "core.modules",
    timestamp: new Date().toISOString(),
    payload: { count: engine.navigation.list().length },
  });
}
