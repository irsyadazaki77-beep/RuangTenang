import { serverDb } from './server/database.js';
serverDb.ping().then(console.log).catch(console.error);
