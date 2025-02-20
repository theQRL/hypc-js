#!/usr/bin/env node

import * as semver from 'semver';
import hypc from './';

const { version: packageVersion } = require('./package.json');

const hypcVersion = (hypc as any).version();

console.log('hypcVersion: ' + hypcVersion);
console.log('packageVersion: ' + packageVersion);

if (semver.eq(packageVersion, hypcVersion)) {
  console.log('Version matching');
  process.exit(0);
} else {
  console.log('Version mismatch');
  process.exit(1);
}
