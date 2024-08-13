import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

const CRYPTO_COMMAND = {
  name: 'crypto',
  type: 1,
  description: 'Fetch information for a crypto',
  options: [
    {
      type: 3,
      name: 'name',
      description: 'Crypto Name',
      required: true,
    },
  ],
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const ALL_COMMANDS = [
  CRYPTO_COMMAND,
];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
