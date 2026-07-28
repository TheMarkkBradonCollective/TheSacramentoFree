import fs from 'fs';
import path from 'path';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const gradlePath = path.join(root, 'android/app/build.gradle');
const gradle = fs.existsSync(gradlePath) ? fs.readFileSync(gradlePath, 'utf8') : '';

const versionName = gradle.match(/versionName\s+"([^"]+)"/)?.[1] ?? pkg.version ?? '0.1.0';
const versionCode = Number.parseInt(gradle.match(/versionCode\s+(\d+)/)?.[1] ?? '1', 10);
const parts = versionName.split('.');
const major = parts[0] ?? '0';
const minor = parts[1] ?? '0';
const patch = parts[2] ?? '0';
const build = String(versionCode).padStart(4, '0');
const channel = 'beta';
const label = `${channel} v${major}.${minor}.${patch}.${build}`;

export function readAppVersion() {
  return {
    channel,
    versionName,
    versionCode,
    major,
    minor,
    patch,
    build,
    label,
  };
}
