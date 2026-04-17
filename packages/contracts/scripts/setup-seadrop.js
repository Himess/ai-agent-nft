#!/usr/bin/env node
// Vendor SeaDrop + its foundry-style deps into node_modules so Hardhat can
// resolve bare-package imports (seadrop/..., ERC721A/..., openzeppelin-contracts/...,
// solmate/..., utility-contracts/...). Idempotent — safe to run repeatedly.
//
// Also rewrites SeaDrop's exact `pragma solidity 0.8.17;` to `^0.8.17` so it
// compiles under our hardhat compiler version.
//
// Runs as a postinstall hook but can also be invoked manually:
//   npm run setup:seadrop

const fs = require("fs");
const path = require("path");

const contractsDir = path.resolve(__dirname, "..");
const seadropLib = path.join(contractsDir, "lib", "seadrop");
const nodeModules = path.join(contractsDir, "node_modules");

if (!fs.existsSync(seadropLib) || !fs.existsSync(path.join(seadropLib, "src", "ERC721SeaDrop.sol"))) {
  console.log(
    "[setup-seadrop] lib/seadrop not initialized. Run: git submodule update --init --recursive"
  );
  process.exit(0);
}

// 1. Rewrite exact-version pragma to caret so it compiles alongside our ^0.8.24 code.
const srcDir = path.join(seadropLib, "src");
function patchPragmas(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      patchPragmas(full);
    } else if (entry.name.endsWith(".sol")) {
      const body = fs.readFileSync(full, "utf8");
      const patched = body.replace(/pragma solidity 0\.8\.17;/g, "pragma solidity ^0.8.17;");
      if (body !== patched) fs.writeFileSync(full, patched);
    }
  }
}
patchPragmas(srcDir);

// 2. Mirror each remapped dep as a top-level node_modules package so Hardhat
//    resolves bare imports without needing a preprocessor.
const vendorMap = [
  ["seadrop", path.join(seadropLib, "src")],
  ["ERC721A", path.join(seadropLib, "lib", "ERC721A", "contracts")],
  [
    "openzeppelin-contracts",
    path.join(seadropLib, "lib", "openzeppelin-contracts", "contracts"),
  ],
  ["solmate", path.join(seadropLib, "lib", "solmate", "src")],
  [
    "utility-contracts",
    path.join(seadropLib, "lib", "utility-contracts", "src"),
  ],
];

function copyRecursive(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

for (const [name, source] of vendorMap) {
  if (!fs.existsSync(source)) {
    console.warn(`[setup-seadrop] missing submodule path for "${name}": ${source}`);
    continue;
  }
  const target = path.join(nodeModules, name);
  fs.rmSync(target, { recursive: true, force: true });
  copyRecursive(source, target);
  fs.writeFileSync(
    path.join(target, "package.json"),
    JSON.stringify({ name, version: "vendored" }, null, 2) + "\n"
  );
}

console.log("[setup-seadrop] SeaDrop + deps vendored into node_modules.");
