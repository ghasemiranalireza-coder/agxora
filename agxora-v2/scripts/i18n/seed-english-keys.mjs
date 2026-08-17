#!/usr/bin/env node
/**
 * Deep-merge additional English source keys required for Global i18n completion.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EN = path.join(__dirname, "../../app/lib/i18n/messages/en");

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function patch(ns, extra) {
  const file = path.join(EN, `${ns}.json`);
  const current = JSON.parse(fs.readFileSync(file, "utf8"));
  deepMerge(current, extra);
  fs.writeFileSync(file, JSON.stringify(current, null, 2) + "\n");
}

patch("common", {
  loadingShort: "Loading",
  create: "Create",
  next: "Next",
  previous: "Previous",
  settings: "Settings",
  profile: "Profile",
  dashboard: "Dashboard",
});

patch("errors", {
  invalidCredentials: "Invalid email or password.",
  signInRequired: "Sign in required.",
  insufficientPermissions: "Insufficient permissions.",
  noRouteAccess: "You do not have access to this route.",
  accountLocked: "This account is locked. Contact an administrator.",
  sessionExpired: "Your session expired. Sign in again.",
  missingPermission: "Missing permission: {permission}",
  roleCannotAccess: "Your role cannot access this resource.",
  codes: {
    AUTH_INVALID_CREDENTIALS: "Invalid email or password.",
    AUTH_SESSION_EXPIRED: "Your session expired. Sign in again.",
    AUTH_ACCOUNT_LOCKED: "This account is locked. Contact an administrator.",
    AUTH_SIGN_IN_REQUIRED: "Sign in to continue.",
    AUTH_INSUFFICIENT_PERMISSIONS: "Insufficient permissions.",
    AUTH_NO_ROUTE_ACCESS: "You do not have access to this route.",
    COMMON_SOMETHING_WENT_WRONG: "Something went wrong.",
    COMMON_PAGE_NOT_FOUND: "Page not found.",
    COMMON_OFFLINE: "You are offline.",
    COMMON_TIMEOUT: "The request timed out.",
    COMMON_VALIDATION: "Please check your input and try again.",
    COMMON_UNKNOWN: "An unknown error occurred.",
    COMMON_INTERNAL: "An unexpected error occurred. Please try again.",
  },
});

patch("backend", {
  loading: "Loading",
  loadingEllipsis: "Loading…",
  loadingIdentity: "Loading identity…",
  network: {
    offlineSyncHint: "Changes may not sync until the connection returns.",
  },
});

patch("customers", {
  validation: {
    companyRequired: "Company name is required.",
    contactRequired: "Contact person is required.",
    emailRequired: "Email is required.",
    emailInvalid: "Enter a valid email address.",
    phoneRequired: "Phone is required.",
    phoneInvalid: "Enter a valid phone number.",
    mobileInvalid: "Enter a valid mobile number.",
    statusInvalid: "Select a valid status.",
    emailDuplicate: "A customer with this email already exists.",
    companyDuplicate: "A customer with this company name already exists.",
  },
});

patch("projects", {
  validation: {
    nameRequired: "Project name is required.",
    nameMin: "Project name must be at least 2 characters.",
    customerRequired: "Customer is required.",
    ownerRequired: "Project owner is required.",
    priorityInvalid: "Select a valid priority.",
    statusInvalid: "Select a valid status.",
    currencyInvalid: "Select a valid currency.",
    budgetInvalid: "Budget must be a non-negative number.",
    startDateRequired: "Start date is required.",
    startDateInvalid: "Enter a valid start date.",
    dueDateInvalid: "Enter a valid due date.",
    dueDateOrder: "Due date must be on or after the start date.",
    colorInvalid: "Choose a valid color.",
    iconInvalid: "Choose a valid icon.",
    taskTitleRequired: "Task title is required.",
    progressRange: "Progress must be between 0 and 100.",
    memberNameRequired: "Member name is required.",
    emailRequired: "Email is required.",
    emailInvalid: "Enter a valid email address.",
    roleInvalid: "Select a valid role.",
    noteTitleRequired: "Note title is required.",
    noteBodyRequired: "Note body is required.",
    authorRequired: "Author is required.",
  },
});

patch("automation", {
  miniPreview: { emptyWorkflow: "Empty workflow" },
  status: {
    connected: "Connected",
    beta: "Beta",
    comingSoon: "Coming soon",
    disabled: "Disabled",
    planned: "Planned",
    success: "Success",
    failed: "Failed",
    running: "Running",
    pending: "Pending",
    retried: "Retry",
  },
  difficulty: {
    starter: "Starter",
    intermediate: "Intermediate",
    advanced: "Advanced",
  },
  catalog: {
    "el-trigger": { label: "Trigger", description: "Start when an event fires" },
    "el-condition": { label: "Condition", description: "Branch on rules" },
    "el-delay": { label: "Delay", description: "Wait before continuing" },
    "el-approval": { label: "Approval", description: "Human approval gate" },
    "el-loop": { label: "Loop", description: "Iterate over a collection" },
    "el-merge": { label: "Merge", description: "Join parallel paths" },
    "el-split": { label: "Split", description: "Fan-out parallel paths" },
    "el-ai-decision": { label: "AI Decision", description: "Route via AI" },
    "el-notification": { label: "Notification", description: "In-app alert" },
    "el-webhook": { label: "Webhook Placeholder", description: "HTTP callback reserved" },
    "el-custom": { label: "Custom Action", description: "Extensible action slot" },
    "tr-customer": { label: "Customer Created", description: "CRM customer record created" },
    "tr-lead": { label: "Lead Created", description: "New lead enters pipeline" },
    "tr-invoice": { label: "Invoice Created", description: "Finance invoice issued" },
    "tr-invoice-paid": { label: "Invoice Paid", description: "Payment settled" },
    "tr-order": { label: "Order Created", description: "Order entered" },
    "tr-order-done": { label: "Order Completed", description: "Order fulfilled" },
    "tr-doc": { label: "Document Uploaded", description: "Document vault upload" },
    "tr-campaign": { label: "Campaign Published", description: "Creator Studio publish" },
    "tr-employee": { label: "Employee Added", description: "Team directory change" },
    "tr-task": { label: "Task Completed", description: "Task marked done" },
    "tr-manual": { label: "Manual Trigger", description: "Run on demand" },
    "tr-schedule": { label: "Schedule Trigger", description: "Cron / calendar schedule" },
    "tr-webhook": { label: "Webhook Trigger", description: "Inbound HTTP event" },
    "tr-api": { label: "API Trigger", description: "Programmatic start" },
    "ac-crm": { label: "Create CRM Record", description: "Write CRM entity" },
    "ac-invoice": { label: "Generate Invoice", description: "Finance invoice" },
    "ac-quote": { label: "Generate Quote", description: "Create quote document" },
    "ac-delivery": { label: "Generate Delivery Note", description: "Delivery note" },
    "ac-task": { label: "Create Task", description: "Open a task" },
    "ac-assign": { label: "Assign Employee", description: "Route to teammate" },
    "ac-email": { label: "Send Email", description: "Outbound email" },
    "ac-notify": { label: "Send Notification", description: "In-app notification" },
    "ac-ai-summary": { label: "Generate AI Summary", description: "Summarize context" },
    "ac-ai-content": { label: "Generate AI Content", description: "Creator Studio draft" },
    "ac-update-customer": { label: "Update Customer", description: "Patch CRM customer" },
    "ac-update-status": { label: "Update Status", description: "Change entity status" },
    "ac-pdf": { label: "Export PDF", description: "Document export" },
    "ac-future": { label: "Future API Placeholder", description: "Reserved action slot" },
    "ai-decision": { label: "AI Decision", description: "Decide next path" },
    "ai-class": { label: "AI Classification", description: "Classify records" },
    "ai-text": { label: "AI Text Generation", description: "Generate text" },
    "ai-translate": { label: "AI Translation", description: "Translate content" },
    "ai-email": { label: "AI Email Reply", description: "Draft reply" },
    "ai-sum": { label: "AI Summarization", description: "Condense context" },
    "ai-rec": { label: "AI Recommendations", description: "Suggest next steps" },
    "ai-route": { label: "AI Routing", description: "Route to owner / queue" },
  },
  triggers: {
    customer_created: { label: "Customer created", description: "Fires when a CRM customer record is created." },
    project_created: { label: "Project created", description: "Fires when a project is created." },
    invoice_issued: { label: "Invoice issued", description: "Fires when an invoice is issued." },
    task_completed: { label: "Task completed", description: "Fires when a task is marked complete." },
    document_uploaded: { label: "Document uploaded", description: "Fires when a document is uploaded." },
    user_invited: { label: "User invited", description: "Fires when a team member is invited." },
    schedule: { label: "Schedule", description: "Cron / interval schedule trigger." },
    webhook: { label: "Webhook", description: "Inbound HTTP webhook trigger." },
    api_event: { label: "API Event", description: "Generic API-emitted domain event." },
    ai_event: { label: "AI Event", description: "AI platform signal (completion, insight, agent step)." },
    manual: { label: "Manual trigger", description: "Run on demand from the Automation UI or API." },
  },
  actions: {
    customer_create: { label: "Create Customer", description: "Create a CRM customer record." },
    customer_update: { label: "Update Customer", description: "Update fields on a customer." },
    project_create: { label: "Create Project", description: "Create a project from workflow context." },
    document_generate: { label: "Generate Document", description: "Generate a document from a template." },
    notification_send: { label: "Send Notification", description: "Push an in-app notification." },
    email_send: { label: "Send Email", description: "Queue an email via the mail provider." },
    api_call: { label: "Call API", description: "HTTP call to an external or internal API." },
    ai_run: { label: "Run AI", description: "Execute an AI prompt / agent step with context." },
    task_assign: { label: "Assign Task", description: "Assign a task to a user." },
    invoice_create: { label: "Create Invoice", description: "Create a finance invoice." },
    status_update: { label: "Update Status", description: "Update entity status in a module." },
  },
});

patch("ai", {
  categories: {
    crm: "CRM",
    projects: "Projects",
    finance: "Finance",
    marketing: "Marketing",
    documents: "Documents",
    automation: "Automation",
    general: "General",
  },
  library: {
    "crm-summarize-customer": { title: "Summarize customer", description: "Executive summary of a customer relationship" },
    "crm-follow-up-email": { title: "Follow-up email", description: "Draft a professional CRM follow-up" },
    "projects-analyze": { title: "Analyze project", description: "Health check for a project" },
    "projects-task-list": { title: "Create task list", description: "Break work into actionable tasks" },
    "finance-explain-invoice": { title: "Explain invoice", description: "Plain-language invoice explanation" },
    "finance-cashflow-brief": { title: "Cashflow brief", description: "Short cashflow narrative" },
    "marketing-campaign-outline": { title: "Campaign outline", description: "Structure a marketing campaign" },
    "marketing-proposal": { title: "Generate proposal", description: "Client-facing proposal draft" },
    "documents-summarize": { title: "Summarize document", description: "Structured document summary" },
    "automation-workflow": { title: "Design workflow", description: "Automation workflow sketch" },
    "general-brainstorm": { title: "Brainstorm options", description: "Structured ideation" },
    "general-explain": { title: "Explain simply", description: "Clear explanation for stakeholders" },
  },
  commands: {
    "cmd-summarize-customer": { label: "Summarize customer", description: "Executive summary of the active customer" },
    "cmd-generate-proposal": { label: "Generate proposal", description: "Draft a client proposal outline" },
    "cmd-analyze-project": { label: "Analyze project", description: "Project health and risk analysis" },
    "cmd-create-task-list": { label: "Create task list", description: "Break work into actionable tasks" },
    "cmd-generate-email": { label: "Generate email", description: "Draft a professional email" },
    "cmd-explain-invoice": { label: "Explain invoice", description: "Plain-language invoice explanation" },
  },
});

patch("creator", {
  formats: {
    instagram_caption: "Instagram Caption",
    tiktok_script: "TikTok Script",
    linkedin_post: "LinkedIn Post",
    facebook_post: "Facebook Post",
    x_post: "X Post",
    blog_article: "Blog Article",
    newsletter: "Newsletter",
    email_campaign: "Email Campaign",
    product_description: "Product Description",
    ad_copy: "Ad Copy",
    seo_article: "SEO Article",
    landing_page_copy: "Landing Page Copy",
  },
  publishStatus: {
    draft: "Draft",
    review: "Review",
    approved: "Approved",
    scheduled: "Scheduled",
    published: "Published",
    archive: "Archive",
  },
  mediaKind: {
    image: "Image",
    video: "Video",
    document: "Document",
    logo: "Brand Logo",
    template: "Template",
  },
  voice: {
    professional: "Professional",
    friendly: "Friendly",
    luxury: "Luxury",
    casual: "Casual",
  },
});

patch("onboarding", {
  defaultCountry: "United States",
  businessTypes: {
    hotel: { label: "Hotel", description: "Hospitality, rooms, guests, and property operations" },
    restaurant: { label: "Restaurant", description: "Dining, kitchen, reservations, and guest experience" },
    cleaning: { label: "Cleaning", description: "Commercial and residential cleaning operations" },
    laundry: { label: "Laundry", description: "Wash plants, pickup routes, and textile care" },
    construction: { label: "Construction", description: "Jobsites, crews, materials, and project delivery" },
    healthcare: { label: "Healthcare", description: "Care networks, patients, and clinical operations" },
    medical: { label: "Medical", description: "Clinics, appointments, and care teams" },
    manufacturing: { label: "Manufacturing", description: "Production lines, quality, and supply operations" },
    retail: { label: "Retail", description: "Stores, inventory, merchandising, and customers" },
    legal: { label: "Law Firm", description: "Matters, clients, deadlines, and billing" },
    accounting: { label: "Accounting", description: "Books, clients, filings, and advisory work" },
    consulting: { label: "Consulting", description: "Engagements, deliverables, and client outcomes" },
    real_estate: { label: "Real Estate", description: "Listings, clients, showings, and transactions" },
    education: { label: "Education", description: "Programs, students, faculty, and enrollment" },
    automotive: { label: "Automotive", description: "Dealerships, service bays, and vehicle inventory" },
    beauty: { label: "Beauty Salon", description: "Appointments, stylists, retail, and memberships" },
    fitness: { label: "Gym / Fitness", description: "Memberships, classes, trainers, and retention" },
    agriculture: { label: "Agriculture", description: "Crops, livestock, yields, and supply chains" },
    transport: { label: "Transport", description: "Fleet movement, routes, and passenger/cargo ops" },
    logistics: { label: "Logistics", description: "Fleet, warehouses, routes, and fulfillment" },
    warehouse: { label: "Warehouse", description: "Storage, picking, packing, and inventory turns" },
    insurance: { label: "Insurance", description: "Policies, claims, underwriting, and retention" },
    finance: { label: "Finance", description: "Capital, portfolios, and financial operations" },
    financial_services: { label: "Financial Services", description: "Advisory, products, compliance, and clients" },
    technology: { label: "Technology", description: "Product, engineering, and go-to-market teams" },
    saas: { label: "Software / SaaS", description: "Subscriptions, usage, and customer success" },
    ecommerce: { label: "E-Commerce", description: "Online catalog, carts, fulfillment, and LTV" },
    agency: { label: "Marketing Agency", description: "Clients, campaigns, retainers, and delivery" },
    freelancer: { label: "Freelancer", description: "Solo practice, clients, pipeline, and cashflow" },
    government: { label: "Government", description: "Public services, programs, and constituents" },
    nonprofit: { label: "Non-Profit", description: "Missions, donors, programs, and impact" },
  },
});

patch("agents", {
  os: {
    prioritizeCustomerImpact: "Prioritize customer impact",
    delegatedFollowUp: "Delegated follow-up",
  },
});

patch("landing", {
  globeAria: "AGXORA AI CORE — 3D globe",
});

patch("auth", {
  validation: {
    emailRequired: "Email is required.",
    emailInvalid: "Enter a valid email address.",
    passwordRequired: "Password is required.",
    passwordMin: "Password must be at least 8 characters.",
    nameRequired: "Name is required.",
    nameMin: "Name must be at least 2 characters.",
    passwordMismatch: "Passwords do not match.",
    slugFormat: "Use lowercase letters, numbers, and hyphens only.",
  },
});

console.log("Seeded English i18n keys.");
