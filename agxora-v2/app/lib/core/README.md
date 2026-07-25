# AGXORA Core Engine

Universal Operating System foundation for every future AGXORA capability.

## Principle

Nothing in the Core Engine knows about industries, laundry, restaurants, hotels, or vertical CRM logic. Applications plug into the engine later.

## Systems

| System | Path | Role |
|---|---|---|
| Core Engine | `engine/` | Bootstrap + composition root |
| Module Registry | `registries/ModuleRegistry.ts` | Module manifests |
| App Registry | `registries/AppRegistry.ts` | Installed apps |
| Navigation Registry | `registries/NavigationRegistry.ts` | Nav contributions |
| Settings Engine | `engines/SettingsEngine.ts` | Scoped settings |
| Workspace Engine | `engines/WorkspaceEngine.ts` | Isolated workspace context |
| Memory Engine | `engines/MemoryEngine.ts` | Architecture-only memory scopes |
| Permission Engine | `engines/PermissionEngine.ts` | Grants / checks |
| Extension Engine | `engines/ExtensionEngine.ts` | Contribution points |
| Plugin System | `plugins/PluginSystem.ts` | Future install/activate lifecycle |
| Configuration Engine | `engines/ConfigurationEngine.ts` | Runtime config |
| Feature Flags | `engines/FeatureFlagEngine.ts` | Rollouts / gates |
| Event Bus | `bus/EventBus.ts` | Decoupled module events |
| Notifications | `engines/NotificationEngine.ts` | Notification architecture |
| Future API Layer | `api/ApiLayer.ts` | Transport port (stub) |

## Module contract

Every module exposes:

- `id`, `name`, `icon`
- `permissions`, `routes`, `navigation`
- `settings`, `capabilities`
- `status`, `version`

Builtin modules self-register via `registerBuiltinModules`.

## Chat

Chat is a **core module** under `app/lib/modules/chat`. UI may send messages; AI responses are not implemented yet.

## Non-goals (this phase)

- No CRM / Finance / Marketplace business logic
- No real AI agents or memory pipelines
- No visual redesign of dashboard / theme / sidebar
