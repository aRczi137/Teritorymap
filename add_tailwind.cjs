const fs = require("fs");
for (const pkg of ["territory-map", "hive-builder"]) {
  const p = JSON.parse(fs.readFileSync("C:/Users/arek/orca/workspaces/arc-tools/packages/" + pkg + "/package.json", "utf8"));
  if (!p.devDependencies) p.devDependencies = {};
  p.devDependencies["tailwindcss"] = "3.4.16";
  p.devDependencies["postcss"] = "8.4.49";
  p.devDependencies["autoprefixer"] = "10.4.20";
  fs.writeFileSync("C:/Users/arek/orca/workspaces/arc-tools/packages/" + pkg + "/package.json", JSON.stringify(p, null, 2), "utf8");
}
console.log("ADDED");
