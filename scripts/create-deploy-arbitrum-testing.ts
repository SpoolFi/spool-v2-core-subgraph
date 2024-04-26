import * as dotenv from 'dotenv';
import { executeCommands, getEnvVar } from './_common';

dotenv.config();

(async () => {
    const endpoint = getEnvVar('ENDPOINT_ARBITRUM_TESTING');

    const commands = [ 
        `graph create spool/core-v2-arbitrum --node ${endpoint}:8020`,
        `graph deploy --product hosted-service spool/core-v2-arbitrum subgraph.yaml --ipfs ${endpoint}:5001 --node ${endpoint}:8020 -l 1.0`
    ];
    await executeCommands(commands);
})();
