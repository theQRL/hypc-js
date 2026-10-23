const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '../dist');

fs.chmodSync(path.join(dist, 'hypc.js'), '755');

// Ship the compiler byte-for-byte: tsc would re-emit (reformat) it, which made the published
// hypjson.js impossible to compare against list.json and the hyperion release SHA256SUMS.
fs.copyFileSync(path.join(__dirname, '../hypjson.js'), path.join(dist, 'hypjson.js'));
