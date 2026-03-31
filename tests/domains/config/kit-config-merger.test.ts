import { describe, it, expect, vi, afterEach } from "vitest";
import * as fs from "@/shared/file-system.js";
import { mergeAndWriteKitConfig } from "@/domains/config/kit-config-merger.js";

vi.mock("@/shared/file-system.js", () => ({
  safeReadFile: vi.fn(),
  safeWriteFile: vi.fn(),
}));

describe("mergeAndWriteKitConfig", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty merged when no packages have kit config", async () => {
    vi.mocked(fs.safeReadFile).mockResolvedValue(null);
    const result = await mergeAndWriteKitConfig(
      [{ name: "core", dir: "/tmp/core" }],
      "/tmp/output/.epost-kit.json",
    );
    expect(result.merged).toEqual({});
    expect(result.sources).toEqual([]);
  });

  it("merges configs from multiple packages", async () => {
    vi.mocked(fs.safeReadFile)
      .mockResolvedValueOnce(
        JSON.stringify({ ignoreFile: ".claude/.epost-ignore", debug: false }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({ extra: "value" }),
      );
    vi.mocked(fs.safeWriteFile).mockResolvedValue(undefined);

    const result = await mergeAndWriteKitConfig(
      [
        { name: "core", dir: "/tmp/core" },
        { name: "kit", dir: "/tmp/kit" },
      ],
      "/tmp/output/.epost-kit.json",
    );

    expect(result.sources).toEqual(["core", "kit"]);
    expect(result.merged).toMatchObject({ extra: "value", debug: false });
  });

  it("applies pathTransformer to output content", async () => {
    vi.mocked(fs.safeReadFile).mockResolvedValueOnce(
      JSON.stringify({ ignoreFile: ".claude/.epost-ignore" }),
    );
    vi.mocked(fs.safeWriteFile).mockResolvedValue(undefined);

    await mergeAndWriteKitConfig(
      [{ name: "core", dir: "/tmp/core" }],
      "/tmp/output/.epost-kit.json",
      (content) => content.replace(/\.claude\//g, ".github/"),
    );

    const writtenContent = vi.mocked(fs.safeWriteFile).mock.calls[0][1] as string;
    expect(writtenContent).toContain(".github/.epost-ignore");
    expect(writtenContent).not.toContain(".claude/");
  });

  it("does not apply pathTransformer when not provided", async () => {
    vi.mocked(fs.safeReadFile).mockResolvedValueOnce(
      JSON.stringify({ ignoreFile: ".claude/.epost-ignore" }),
    );
    vi.mocked(fs.safeWriteFile).mockResolvedValue(undefined);

    await mergeAndWriteKitConfig(
      [{ name: "core", dir: "/tmp/core" }],
      "/tmp/output/.epost-kit.json",
    );

    const writtenContent = vi.mocked(fs.safeWriteFile).mock.calls[0][1] as string;
    expect(writtenContent).toContain(".claude/.epost-ignore");
  });
});
