import { describe, expect, it } from "vitest";
import { normalizeVideoMime, objectKey } from "./keys";

describe("clés de stockage vidéo", () => {
  it("rangent chaque fichier sous le client et l'élément, avec un nom nettoyé", () => {
    expect(objectKey("video", "c1", "v1", "Live du 20/10 (intégral).MP4")).toBe("videos/c1/v1/Live-du-20-10-integral.mp4");
    expect(objectKey("clip", "c1", "k1", "../../x.mp4")).not.toContain("..");
  });

  it("acceptent les formats vidéo courants, y compris sans type MIME", () => {
    expect(normalizeVideoMime("video/mp4", "a.mp4")).toBe("video/mp4");
    expect(normalizeVideoMime("", "a.mkv")).toBe("video/x-matroska");
    expect(normalizeVideoMime("application/zip", "a.zip")).toBeNull();
  });
});
