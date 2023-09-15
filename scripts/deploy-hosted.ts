import * as dotenv from 'dotenv';
import { execPromised, getEnvVar } from './_common';

dotenv.config();

(async () => {
    if (process.argv.length !== 3) {
        throw new Error('Invalid number of parameters.');
    }
    const subgraphName = process.argv[2];

    const accessTokenHosted = getEnvVar('ACCESS_TOKEN_HOSTED');

    const command = `graph deploy ${subgraphName} --access-token ${accessTokenHosted} --product hosted-service --ipfs https://api.thegraph.com/ipfs/ --node https://api.thegraph.com/deploy/`;
    await execPromised(command);
})();
