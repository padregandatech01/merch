import type { ReactNode } from "react";

export default function AuthCard({ children }: { children: ReactNode }) {
  return (
  <main className="me-entry">
    <div className="me-entry-brand"><strong>LOXADA<span>®</span></strong><small>MERCHANDISE</small></div>
    <section className="me-entry-card">
      {children}
    </section>
  </main>
  );
}
