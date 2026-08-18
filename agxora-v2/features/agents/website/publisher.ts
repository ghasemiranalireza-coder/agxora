import type { WebsiteProject, WebsitePublishResult } from "./types";

export interface WebsitePublisherAdapter {
  publish(project: WebsiteProject): Promise<WebsitePublishResult>;
}

export const unavailableWebsitePublisher: WebsitePublisherAdapter = {
  async publish(): Promise<WebsitePublishResult> {
    return {
      available: false,
      status: "unavailable",
      published: false,
      reason: "publisher_unavailable",
    };
  },
};

let publisher: WebsitePublisherAdapter = unavailableWebsitePublisher;

export function setWebsitePublisher(next: WebsitePublisherAdapter): void {
  publisher = next;
}

export function getWebsitePublisher(): WebsitePublisherAdapter {
  return publisher;
}
