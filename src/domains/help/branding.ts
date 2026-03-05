/**
 * epost-kit branding: logo and version text
 * Logo based on the epost "e" brand mark (e.svg)
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Read version from package.json at runtime (dist/domains/help/ → ../../../package.json)
const _pkgPath = join(dirname(fileURLToPath(import.meta.url)), "../../../package.json");
export const VERSION: string = JSON.parse(readFileSync(_pkgPath, "utf-8")).version;

export const LOGO = `
        ████████████
     ████████████████████
   ██████            ██████
  █████                █████
 █████                  █████
 █████                  █████
 ████████████████████████████
 ████████████████████████████
 █████
 █████                  ▄▄▄▄▄
  █████               ██████
   ██████           ██████
     ████████████████████
        ████████████`;

export const LOGO_PLAIN = `epost-kit v${VERSION}`;

export const TAGLINE = "Multi-IDE agent framework for development teams";
