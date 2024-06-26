import * as dotenv from 'dotenv';
import { executeCommands, getEnvVar, getVersionLabel } from './_common';

dotenv.config();

(async () => {
    if (process.argv.length !== 3) {
        throw new Error('Invalid number of parameters.');
    }
    const subgraphName = process.argv[2];

    const accessTokenStudio = getEnvVar('ACCESS_TOKEN_STUDIO');
    const versionLabel = await getVersionLabel();

    const studioKey = `${accessTokenStudio.slice(0, 6)}-${accessTokenStudio.slice(-6)}`;

    const authCommand = `graph auth --studio '${studioKey}'`;
    const deployCommand = `graph deploy ${subgraphName} --version-label ${versionLabel} --deploy-key ${accessTokenStudio} --studio`;
    const commands = [ 
        `${authCommand} && ${deployCommand}` 
    ];
    await executeCommands(commands);
})();
