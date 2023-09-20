import * as dotenv from 'dotenv';
import { execPromised, getEnvVar } from './_common';

dotenv.config();

(async () => {
    const network = getEnvVar('NETWORK');

    const commands = [
        `mustache src/config/contracts.${network}.json subgraph.template.yaml > subgraph.yaml`,
        `mustache src/config/contracts.${network}.json src/utils/helpers.template.ts > src/utils/helpers.ts`,
        `mustache src/config/contracts.${network}.json docker-compose.template.yml > docker-compose.yml`,
    ];

    await Promise.all(
        commands.map((c) => execPromised(c))
    );
})();
