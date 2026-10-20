import { describe, expect, it } from "vitest";
import { knownLinkHost, videoLinkSchema } from "./video";

describe("vidéo par lien", () => {
  const base = { title: "", notes: "", priority: "normale", recordedAt: "" } as const;
  it("n'accepte que des liens https", () => {
    expect(videoLinkSchema.safeParse({ ...base, url: "https://www.twitch.tv/videos/1" }).success).toBe(true);
    expect(videoLinkSchema.safeParse({ ...base, url: "http://exemple.fr/v" }).success).toBe(false);
    expect(videoLinkSchema.safeParse({ ...base, url: "javascript:alert(1)" }).success).toBe(false);
  });

  it("reconnaît les services courants", () => {
    expect(knownLinkHost("https://www.youtube.com/watch?v=x")).toBe("youtube.com");
    expect(knownLinkHost("https://drive.google.com/file/d/x")).toBe("drive.google.com");
    expect(knownLinkHost("https://exemple.fr/x")).toBeNull();
  });
});
