import type {
  Activity,
  AutomationRun,
  Customer,
  Document,
  Invoice,
  Notification,
  Project,
  TeamMember,
  User,
  Workflow,
} from "../types";
import { createMemoryRepository } from "./memory";
import type {
  ActivityRepository,
  AutomationRunRepository,
  CustomerRepository,
  DocumentRepository,
  InvoiceRepository,
  NotificationRepository,
  ProjectRepository,
  TeamMemberRepository,
  UserRepository,
  WorkflowRepository,
} from "./types";

export interface RepositoryRegistry {
  readonly users: UserRepository;
  readonly customers: CustomerRepository;
  readonly projects: ProjectRepository;
  readonly invoices: InvoiceRepository;
  readonly documents: DocumentRepository;
  readonly workflows: WorkflowRepository;
  readonly automationRuns: AutomationRunRepository;
  readonly teamMembers: TeamMemberRepository;
  readonly notifications: NotificationRepository;
  readonly activities: ActivityRepository;
}

export function createRepositoryRegistry(): RepositoryRegistry {
  return {
    users: createMemoryRepository<User>("user"),
    customers: createMemoryRepository<Customer>("customer"),
    projects: createMemoryRepository<Project>("project"),
    invoices: createMemoryRepository<Invoice>("invoice"),
    documents: createMemoryRepository<Document>("document"),
    workflows: createMemoryRepository<Workflow>("workflow"),
    automationRuns: createMemoryRepository<AutomationRun>("run"),
    teamMembers: createMemoryRepository<TeamMember>("member"),
    notifications: createMemoryRepository<Notification>("notif"),
    activities: createMemoryRepository<Activity>("activity"),
  };
}

export const repositories: RepositoryRegistry = createRepositoryRegistry();

export * from "./types";
export { createMemoryRepository } from "./memory";
export {
  crmDataRepository,
  projectsDataRepository,
  financeDataRepository,
  documentsDataRepository,
  aiDataRepository,
  identityDataRepository,
  domainRepositories,
  type DomainRepositoryRegistry,
} from "./domain";
