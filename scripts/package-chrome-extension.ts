import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "fs";
import path from "path";

const root = process.cwd();
const extensionDir = path.join(root, "chrome-extension");
const distDir = path.join(root, "dist", "chrome-extension");
const manifestPath = path.join(extensionDir, "manifest.json");
const requiredFiles = ["manifest.json", "content.js", "popup.html", "popup.css", "popup.js", "README.md"];

type Manifest = {
  manifest_version?: number;
  name?: string;
  version?: string;
};

function main() {
  if (!existsSync(manifestPath)) throw new Error("chrome-extension/manifest.json is missing.");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
  if (manifest.manifest_version !== 3) throw new Error("Chrome extension must use Manifest V3.");
  if (!manifest.name?.trim()) throw new Error("Chrome extension manifest is missing a name.");
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version ?? "")) throw new Error("Chrome extension version must use x.y.z format.");

  const missing = requiredFiles.filter((fileName) => !existsSync(path.join(extensionDir, fileName)));
  if (missing.length) throw new Error(`Chrome extension is missing required files: ${missing.join(", ")}`);

  mkdirSync(distDir, { recursive: true });
  const archiveName = `${slugify(manifest.name)}-${manifest.version}.zip`;
  const archivePath = path.join(distDir, archiveName);
  if (existsSync(archivePath)) rmSync(archivePath);

  execFileSync("zip", ["-qr", archivePath, ...requiredFiles], {
    cwd: extensionDir,
    stdio: "inherit",
  });

  console.log(`Packaged Chrome extension: ${path.relative(root, archivePath)}`);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

main();
