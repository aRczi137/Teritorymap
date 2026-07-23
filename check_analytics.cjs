const fs = require("fs");

// 1. Fix analytics - ensure trackEvent is exported
let analytics = fs.readFileSync("C:/Users/arek/orca/workspaces/arc-tools/packages/shared/src/analytics.ts", "utf8");
console.log("Analytics first 100 chars:", analytics.substring(0, 100));
