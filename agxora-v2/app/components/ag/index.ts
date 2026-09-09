/**
 * AGXORA product UI aliases — wrap the existing enterprise kit.
 * Native apps can reuse these names without duplicating business logic.
 */

export {
  Button as AGButton,
  IconButton as AGIconButton,
  Card as AGCard,
  Card as AGGlassPanel,
  Badge as AGBadge,
  DataTable as AGTable,
  EmptyState as AGEmptyState,
  ErrorState as AGErrorState,
  Skeleton as AGLoadingState,
  Dialog as AGModal,
  FormInput as AGInput,
  FormField,
  FormTextArea,
  FormSelect,
} from "../ui";
export { MetricCard as AGMetricCard } from "../dashboard/MetricCard";
export { AGCommandInput } from "./AGCommandInput";
export { AGStatus } from "./AGStatus";
export type { ButtonVariant as AGButtonVariant } from "../ui";
export { UI as AGTokens } from "../ui/tokens";
