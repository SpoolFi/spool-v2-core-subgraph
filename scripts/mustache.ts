import * as dotenv from 'dotenv';
import {execPromised, getEnvVar} from './_common';

dotenv.config();

(async () => {
    const network = getEnvVar('NETWORK');
    const envId = `RPC_` + network.toUpperCase().replace('.', '_');
    const rpc = getEnvVar(envId);
    const view = `{"rpc": "${rpc}"}`;

    await execPromised(`printf '${view}' > view.json`);
    await execPromised(`mustache view.json src/config/contracts.${network}.template.json > src/config/contracts.${network}.json`);
    await execPromised(`rimraf view.json`);

    const commands = [
        `mustache src/config/contracts.${network}.json subgraph.template.yaml > subgraph.yaml`,
        `mustache src/config/contracts.${network}.json src/utils/helpers.template.ts > src/utils/helpers.ts`,
        `mustache src/config/contracts.${network}.json docker-compose.template.yml > docker-compose.yml`,
    ];

    await Promise.all(
        commands.map((c) => execPromised(c))
    );
})();
