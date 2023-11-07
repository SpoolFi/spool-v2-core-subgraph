import * as dotenv from 'dotenv';
import { execPromised, getEnvVar, getVersionLabel } from './_common';

dotenv.config();

(async () => {
    if (process.argv.length !== 3) {
        throw new Error('Invalid number of parameters.');
    }
    const subgraphName = process.argv[2];

    const accessTokenSatsuma = getEnvVar('ACCESS_TOKEN_SATSUMA');
    const versionLabel = await getVersionLabel();

    const command = `graph deploy ${subgraphName} --version-label ${versionLabel} --node https://subgraphs.alchemy.com/api/subgraphs/deploy --deploy-key ${accessTokenSatsuma} --ipfs https://ipfs.satsuma.xyz`;
    console.log(command);
    await execPromised(command);
})();
