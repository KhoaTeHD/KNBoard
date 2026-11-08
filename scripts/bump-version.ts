import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const newVersion = process.argv[2];
if (!newVersion || !/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error('Cách dùng: npm run bump-version <x.y.z>  (Ví dụ: npm run bump-version 1.0.1)');
  process.exit(1);
}

const root = process.cwd();

// 1. Update package.json
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// 2. Update src-tauri/tauri.conf.json
const tauriConfPath = path.join(root, 'src-tauri', 'tauri.conf.json');
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf-8'));
tauriConf.version = newVersion;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');

// 3. Update src-tauri/Cargo.toml
const cargoPath = path.join(root, 'src-tauri', 'Cargo.toml');
let cargoContent = fs.readFileSync(cargoPath, 'utf-8');
cargoContent = cargoContent.replace(/^version = ".*"$/m, `version = "${newVersion}"`);
fs.writeFileSync(cargoPath, cargoContent);

// 4. Update src/core/autoUpdater.ts
const updaterPath = path.join(root, 'src', 'core', 'autoUpdater.ts');
let updaterContent = fs.readFileSync(updaterPath, 'utf-8');
updaterContent = updaterContent.replace(
  /export const CURRENT_APP_VERSION = '.*';/,
  `export const CURRENT_APP_VERSION = '${newVersion}';`
);
fs.writeFileSync(updaterPath, updaterContent);

console.log(`✅ Đã đồng bộ phiên bản v${newVersion} trên toàn bộ dự án!`);
console.log(`👉 Để đẩy bản cập nhật lên GitHub Releases, chạy lệnh:`);
console.log(`   git add . && git commit -m "Release v${newVersion}" && git tag v${newVersion} && git push && git push --tags`);
