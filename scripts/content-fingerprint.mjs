import { createHash } from "node:crypto";

export function withoutFingerprint(html) {
  return html.replace(/<meta name="sportenvo-content-sha256" content="[a-f0-9]{64}">\r?\n/g, "");
}

export function contentFingerprint(html) {
  return createHash("sha256").update(withoutFingerprint(html).replace(/\r\n/g, "\n").replace(/^\uFEFF/, "").trim()).digest("hex");
}
