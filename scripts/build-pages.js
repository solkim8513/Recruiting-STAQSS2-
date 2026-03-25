const fs = require("fs");
const path = require("path");

const root = process.cwd();
const dist = path.join(root, "dist");
const filesToCopy = ["index.html", "app.js", "styles.css", "favicon.svg", ".nojekyll"];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const fileName of filesToCopy) {
  fs.copyFileSync(path.join(root, fileName), path.join(dist, fileName));
}

console.log(`Copied ${filesToCopy.length} static files into ${dist}`);
