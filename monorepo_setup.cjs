const fs = require("fs");
const path = require("path");
const base = "C:/Users/arek/orca/workspaces/arc-tools";
const src = "C:/Users/arek/orca/workspaces/Teritorymap/main/src";

function copyDir(from, to) {
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

// ── 1. Shared files ──
copyDir(src + "/auth", base + "/packages/shared/src/auth");
copyFile(src + "/firebaseConfig.ts", base + "/packages/shared/src/firebaseConfig.ts");
copyFile(src + "/analytics.ts", base + "/packages/shared/src/analytics.ts");
copyFile(src + "/components/UserMenu.tsx", base + "/packages/shared/src/components/UserMenu.tsx");
copyFile(src + "/auth/basePath.ts", base + "/packages/shared/src/auth/basePath.ts");
console.log("1. Shared files copied");

// ── 2. Territory map files ──
copyFile(src + "/AllianceMapManager.tsx", base + "/packages/territory-map/src/AllianceMapManager.tsx");
copyFile(src + "/data/regionsS6.ts", base + "/packages/territory-map/src/data/regionsS6.ts");
copyFile(src + "/index.css", base + "/packages/territory-map/src/index.css");
copyFile(src + "/vite-env.d.ts", base + "/packages/territory-map/src/vite-env.d.ts");
// Copy fonts
copyDir("C:/Users/arek/orca/workspaces/Teritorymap/main/src/fonts", base + "/packages/territory-map/src/fonts");
console.log("2. Territory map files copied");

// ── 3. Hive builder files ──
copyDir(src + "/frankenstein", base + "/packages/hive-builder/src");
console.log("3. Hive builder files copied");

// ── 4. Update import paths in all files ──
function walkDir(dir, fn) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") walkDir(p, fn);
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) fn(p);
  }
}

// Shared package: update imports to use relative paths within shared
walkDir(base + "/packages/shared/src", (fp) => {
  let c = fs.readFileSync(fp, "utf8");
  // Auth files reference ../firebaseConfig → ./firebaseConfig
  c = c.replace(/from\s+["']\.\.\/firebaseConfig["']/g, 'from "../firebaseConfig"');
  c = c.replace(/from\s+["']\.\.\/analytics["']/g, 'from "../analytics"');
  // Fix AuthContext path to useIndexedDB
  c = c.replace(/from\s+["']\.\/useIndexedDBCache["']/g, 'from "./useIndexedDBCache"');
  fs.writeFileSync(fp, c, "utf8");
});

// Territory map: update frankenstein → local
walkDir(base + "/packages/territory-map/src", (fp) => {
  let c = fs.readFileSync(fp, "utf8");
  // Remove frankenstein imports from AllianceMapManager (they were used for tab switching)
  // AllianceMapManager imports FrankensteinEventTab - keep as reference to hive-builder package
  // Actually, with monorepo, territory-map doesn't import hive-builder directly (separate apps)
  // Let me check what imports from frankenstein exist in AllianceMapManager
  fs.writeFileSync(fp, c, "utf8");
});

// Hive builder: update frankenstein → relative local paths
walkDir(base + "/packages/hive-builder/src", (fp) => {
  let c = fs.readFileSync(fp, "utf8");
  // frankenstein/* imports become ./*
  c = c.replace(/from\s+["']\.\.\/analytics["']/g, 'from "./analytics"');
  c = c.replace(/from\s+["']\.\.\/firebaseConfig["']/g, 'from "./firebaseConfig"');
  // Fix relative imports within frankenstein (they already use ./, so fine)
  fs.writeFileSync(fp, c, "utf8");
});

console.log("4. Import paths updated");

// ── 5. Create package.json files ──
const rootPkg = {
  name: "arc-tools",
  private: true,
  workspaces: ["packages/*"]
};
fs.writeFileSync(base + "/package.json", JSON.stringify(rootPkg, null, 2), "utf8");

const sharedPkg = {
  name: "@arc-tools/shared",
  version: "0.0.0",
  private: true,
  main: "src/index.ts",
  dependencies: {
    react: "^19.0.0",
    "react-dom": "^19.0.0",
    firebase: "^11.0.0",
    "lucide-react": "^0.468.0"
  },
  peerDependencies: {
    react: "^19.0.0",
    "react-dom": "^19.0.0"
  }
};
fs.writeFileSync(base + "/packages/shared/package.json", JSON.stringify(sharedPkg, null, 2), "utf8");

const mapPkg = {
  name: "@arc-tools/territory-map",
  version: "0.0.0",
  private: true,
  scripts: {
    dev: "vite",
    build: "tsc && vite build",
    preview: "vite preview"
  },
  dependencies: {
    "@arc-tools/shared": "workspace:*",
    react: "^19.0.0",
    "react-dom": "^19.0.0",
    firebase: "^11.0.0",
    "lucide-react": "^0.468.0"
  }
};
fs.writeFileSync(base + "/packages/territory-map/package.json", JSON.stringify(mapPkg, null, 2), "utf8");

const hivePkg = {
  name: "@arc-tools/hive-builder",
  version: "0.0.0",
  private: true,
  scripts: {
    dev: "vite",
    build: "tsc && vite build",
    preview: "vite preview"
  },
  dependencies: {
    "@arc-tools/shared": "workspace:*",
    react: "^19.0.0",
    "react-dom": "^19.0.0",
    firebase: "^11.0.0",
    "lucide-react": "^0.468.0",
    tesseract: "^5.0.0"
  }
};
fs.writeFileSync(base + "/packages/hive-builder/package.json", JSON.stringify(hivePkg, null, 2), "utf8");

console.log("5. Package.json files created");
console.log("DONE - manual tsconfig and vite config needed");
