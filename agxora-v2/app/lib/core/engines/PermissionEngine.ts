/**
 * Permission Engine — universal authorization surface for modules.
 */

import type { ModuleId, PermissionId } from "../ids";
import type { PermissionDefinition, PermissionEffect, PermissionGrant } from "../types";

export interface PermissionCheckContext {
  readonly subjectId: string;
  readonly workspaceId?: string;
  readonly organizationId?: string;
}

export interface PermissionEngine {
  define(definitions: readonly PermissionDefinition[]): void;
  getDefinition(id: PermissionId): PermissionDefinition | undefined;
  listDefinitions(): readonly PermissionDefinition[];
  listByModule(moduleId: ModuleId): readonly PermissionDefinition[];
  grant(grant: PermissionGrant): void;
  revoke(permissionId: PermissionId, subjectId: string): void;
  check(permissionId: PermissionId, context: PermissionCheckContext): boolean;
  listGrants(subjectId: string): readonly PermissionGrant[];
}

export function createPermissionEngine(): PermissionEngine {
  const definitions = new Map<PermissionId, PermissionDefinition>();
  const grants: PermissionGrant[] = [];

  return {
    define(defs) {
      for (const def of defs) {
        definitions.set(def.id, def);
      }
    },

    getDefinition(id) {
      return definitions.get(id);
    },

    listDefinitions() {
      return [...definitions.values()];
    },

    listByModule(moduleId) {
      return [...definitions.values()].filter((d) => d.moduleId === moduleId);
    },

    grant(grant) {
      const idx = grants.findIndex(
        (g) =>
          g.permissionId === grant.permissionId &&
          g.subjectId === grant.subjectId &&
          g.workspaceId === grant.workspaceId &&
          g.organizationId === grant.organizationId,
      );
      if (idx >= 0) grants[idx] = grant;
      else grants.push(grant);
    },

    revoke(permissionId, subjectId) {
      for (let i = grants.length - 1; i >= 0; i -= 1) {
        if (
          grants[i].permissionId === permissionId &&
          grants[i].subjectId === subjectId
        ) {
          grants.splice(i, 1);
        }
      }
    },

    check(permissionId, context) {
      if (!definitions.has(permissionId)) return false;

      const relevant = grants.filter((g) => {
        if (g.permissionId !== permissionId) return false;
        if (g.subjectId !== context.subjectId) return false;
        if (g.workspaceId && g.workspaceId !== context.workspaceId) return false;
        if (g.organizationId && g.organizationId !== context.organizationId) {
          return false;
        }
        return true;
      });

      if (relevant.length === 0) return false;

      let effect: PermissionEffect = "deny";
      for (const g of relevant) {
        if (g.effect === "deny") return false;
        effect = g.effect;
      }
      return effect === "allow";
    },

    listGrants(subjectId) {
      return grants.filter((g) => g.subjectId === subjectId);
    },
  };
}
