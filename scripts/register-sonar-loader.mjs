/* Registers the Sonar v2 resolve hook (sonar-node-loader.mjs) for the check
   script, via node --import. */
import { register } from 'node:module';
register('./sonar-node-loader.mjs', import.meta.url);
