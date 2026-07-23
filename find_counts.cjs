const fs = require("fs");
let c = fs.readFileSync("C:/Users/arek/orca/workspaces/arc-tools/packages/territory-map/src/AllianceMapManager.tsx", "utf8");
let lines = c.split("\n");
lines.forEach((l, i) => {
  if (l.includes("territoryCount") || l.includes("regionCount") || (l.includes("count") && l.includes("alliance"))) {
    console.log((i+1) + ": " + l.trim().substring(0, 120));
  }
});
// Also search for territory count near alliance name in sidebar
lines.forEach((l, i) => {
  if (l.includes("/8") || l.includes("territories") || l.includes("LIMIT REACHED")) {
    console.log((i+1) + ": " + l.trim().substring(0, 120));
  }
});
