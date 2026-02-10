/* ──────────────────────────────────────────────────────────
   Hunter – Provider Interface
   ────────────────────────────────────────────────────────── */

export interface Provider {
  name: string;
  getUrls(): Promise<string[]>;
}
