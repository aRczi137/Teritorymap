const fs = require("fs");
const path = require("path");
const base = "C:/Users/arek/orca/workspaces/arc-tools";
const src = "C:/Users/arek/orca/workspaces/Teritorymap/main/src";

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

// Shared
copyDir(src + "/auth", base + "/packages/shared/src/auth");
copyFile(src + "/firebaseConfig.ts", base + "/packages/shared/src/firebaseConfig.ts");
copyFile(src + "/analytics.ts", base + "/packages/shared/src/analytics.ts");
copyFile(src + "/components/UserMenu.tsx", base + "/packages/shared/src/components/UserMenu.tsx");
console.log("1. Shared done");

// Territory map
copyFile(src + "/AllianceMapManager.tsx", base + "/packages/territory-map/src/AllianceMapManager.tsx");
copyFile(src + "/data/regionsS6.ts", base + "/packages/territory-map/src/data/regionsS6.ts");
copyFile(src + "/index.css", base + "/packages/territory-map/src/index.css");
copyFile(src + "/vite-env.d.ts", base + "/packages/territory-map/src/vite-env.d.ts");
console.log("2. Territory map done");

// Hive builder
copyDir(src + "/frankenstein", base + "/packages/hive-builder/src");
console.log("3. Hive builder done (" + fs.readdirSync(base + "/packages/hive-builder/src").length + " files)");

// Root package.json
fs.writeFileSync(base + "/package.json", JSON.stringify({
  name: "arc-tools", private: true, workspaces: ["packages/*"]
}, null, 2), "utf8");

// Shared package.json
fs.writeFileSync(base + "/packages/shared/package.json", JSON.stringify({
  name: "@arc-tools/shared", version: "0.0.0", private: true, type: "module",
  main: "src/index.ts",
  dependencies: { react: "^19.0.0", "react-dom": "^19.0.0", firebase: "^11.0.0", "lucide-react": "^0.468.0" }
}, null, 2), "utf8");

// Territory map package.json
fs.writeFileSync(base + "/packages/territory-map/package.json", JSON.stringify({
  name: "@arc-tools/territory-map", version: "0.0.0", private: true, type: "module",
  scripts: { dev: "vite", build: "tsc && vite build" },
  dependencies: { "@arc-tools/shared": "workspace:*", react: "^19.0.0", "react-dom": "^19.0.0", firebase: "^11.0.0", "lucide-react": "^0.468.0" }
}, null, 2), "utf8");

// Hive builder package.json
fs.writeFileSync(base + "/packages/hive-builder/package.json", JSON.stringify({
  name: "@arc-tools/hive-builder", version: "0.0.0", private: true, type: "module",
  scripts: { dev: "vite", build: "tsc && vite build" },
  dependencies: { "@arc-tools/shared": "workspace:*", react: "^19.0.0", "react-dom": "^19.0.0", firebase: "^11.0.0", "lucide-react": "^0.468.0", tesseract: "^5.0.0" }
}, null, 2), "utf8");

console.log("ALL DONE");
