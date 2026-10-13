import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const platform = process.argv[2];
if (!['android', 'ios'].includes(platform)) throw new Error('Choose android or ios');
const version = JSON.parse(await readFile('package.json', 'utf8')).version;
const build = process.env.GITHUB_RUN_NUMBER || '1';
if (!/^\d+\.\d+\.\d+$/.test(version) || !/^\d+$/.test(build)) throw new Error('Invalid app version');
const cap = (...args) => execFileSync(process.execPath, ['node_modules/@capacitor/cli/bin/capacitor', ...args], { stdio: 'inherit' });
// Native projects come from the locked Capacitor templates, including Gradle/SPM.
if (!existsSync(platform)) cap('add', platform);
if (platform === 'android') {
  const variables = 'android/variables.gradle';
  await writeFile(variables, (await readFile(variables, 'utf8')).replace(/minSdkVersion = \d+/, 'minSdkVersion = 28'));
  const gradle = 'android/app/build.gradle';
  await writeFile(gradle, (await readFile(gradle, 'utf8'))
    .replace(/versionCode \d+/, `versionCode ${build}`)
    .replace(/versionName "[^"]+"/, `versionName "${version}"`));
} else {
  const project = 'ios/App/App.xcodeproj/project.pbxproj';
  await writeFile(project, (await readFile(project, 'utf8'))
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
    .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${build};`));
}
cap('sync', platform);
