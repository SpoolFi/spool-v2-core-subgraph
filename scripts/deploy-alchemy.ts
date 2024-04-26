import * as dotenv from 'dotenv';
import { executeCommands, getEnvVar, getVersionLabel } from './_common';

dotenv.config();

(async () => {
    if (process.argv.length !== 3) {
        throw new Error('Invalid number of parameters.');
    }
    const subgraphName = process.argv[2];

    const accessTokenAlchemy = getEnvVar('ACCESS_TOKEN_ALCHEMY');
    const versionLabel = await getVersionLabel();

    const commands = [ 
        `graph deploy ${subgraphName} --version-label ${versionLabel} --node https://subgraphs.alchemy.com/api/subgraphs/deploy --deploy-key ${accessTokenAlchemy} --ipfs https://ipfs.satsuma.xyz` 
    ];
    await executeCommands(commands);
})();
