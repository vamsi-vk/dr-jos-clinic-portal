import { defineConfig } from "vite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function copyManifestAndIcons() {
  const outDir = path.resolve(__dirname, "dist");
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.resolve(outDir, "icons"), { recursive: true });

  const manifest = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "manifest.json"), "utf8")
  );
  manifest.background.service_worker = "background.js";
  manifest.content_scripts[0].js = ["content.js"];
  delete manifest.content_scripts[0].type;
  manifest.action.default_popup = "popup.html";
  fs.writeFileSync(
    path.resolve(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  for (const size of ["16", "48", "128"]) {
    const src = path.resolve(__dirname, `icons/icon${size}.png`);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.resolve(outDir, `icons/icon${size}.png`));
    }
  }
}

function bundleContentScriptIife() {
  buildSync({
    entryPoints: [path.resolve(__dirname, "src/content.ts")],
    bundle: true,
    outfile: path.resolve(__dirname, "dist/content.js"),
    format: "iife",
    platform: "browser",
    target: "chrome100",
    logLevel: "info",
  });
}

export default defineConfig({
  root: "src",
  base: "./",
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: path.resolve(__dirname, "src/background.ts"),
        popup: path.resolve(__dirname, "src/popup.html"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
  },
  plugins: [
    {
      name: "copy-extension-assets",
      closeBundle() {
        bundleContentScriptIife();
        copyManifestAndIcons();
        const nested = path.resolve(__dirname, "dist/src/popup.html");
        const flat = path.resolve(__dirname, "dist/popup.html");
        if (fs.existsSync(nested)) {
          fs.renameSync(nested, flat);
          const srcDir = path.resolve(__dirname, "dist/src");
          if (fs.existsSync(srcDir)) {
            fs.rmSync(srcDir, { recursive: true, force: true });
          }
        }
      },
    },
  ],
});
