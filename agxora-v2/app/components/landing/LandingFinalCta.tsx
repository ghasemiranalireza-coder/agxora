import type { JSX } from "react";
import Link from "next/link";

export function LandingFinalCta(): JSX.Element {
  return (
    <section
      id="start"
      className="agx-landing-section agx-landing-final"
      aria-labelledby="landing-start-title"
    >
      <div className="agx-landing-section__inner">
        <p className="agx-landing-kicker">Launch</p>
        <h2 id="landing-start-title" className="agx-landing-title">
          Start with AGXORA
        </h2>
        <p className="agx-landing-lead">
          Create a workspace, explore the platform, or book a consultation with
          the team preparing the public release.
        </p>
        <div className="agx-landing-hero__actions">
          <Link href="/onboarding" className="agx-landing-btn agx-landing-btn--primary">
            Start Free
          </Link>
          <Link href="/login" className="agx-landing-btn agx-landing-btn--secondary">
            Explore Platform
          </Link>
          <a href="mailto:hello@agxora.app" className="agx-landing-btn agx-landing-btn--ghost">
            Book Consultation
          </a>
        </div>
      </div>
    </section>
  );
}
