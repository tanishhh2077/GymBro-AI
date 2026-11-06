// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(fileURLToPath(new URL(path, root)), 'utf8');

it('pins compatible native backup export plugins', () => {
  const dependencies = JSON.parse(read('package.json')).dependencies;
  expect(dependencies['@capacitor/filesystem']).toBe('8.1.5');
  expect(dependencies['@capacitor/share']).toBe('8.0.3');
});
it('embeds the app filesystem privacy declaration as an iOS resource', () => {
  const manifest = read('ios/App/App/PrivacyInfo.xcprivacy');
  expect(manifest).toContain('NSPrivacyAccessedAPICategoryFileTimestamp');
  expect(manifest).toContain('C617.1');
  const project = read('ios/App/App.xcodeproj/project.pbxproj');
  expect(project.match(/PrivacyInfo\.xcprivacy in Resources/g)).toHaveLength(2);
  expect(project).toMatch(/path = PrivacyInfo\.xcprivacy/);
});
it('keeps native export out of public Android storage permissions', () => {
  expect(read('android/app/src/main/AndroidManifest.xml')).not.toMatch(/READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|MANAGE_EXTERNAL_STORAGE/);
});
