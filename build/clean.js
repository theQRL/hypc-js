const fs = require('fs');
const path = require('path');

const distFolder = path.join(__dirname, '../dist');

fs.rmSync(distFolder, { recursive: true, force: true });
