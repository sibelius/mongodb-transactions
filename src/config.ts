import path from 'path';

import dotenvSafe from 'dotenv-safe';

const cwd = process.cwd();

const root = path.join.bind(cwd);

dotenvSafe.config({
  path: root('.env'),
  sample: root('.env.example'),
});

export const config = {
  PORT: process.env.PORT || 5566,
  NODE_ENV: process.env.NODE_ENV,
  MONGO_URI: process.env.MONGO_URI,
}
