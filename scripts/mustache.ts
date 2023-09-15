import { execPromised } from './_common';

(async () => {
    if (process.argv.length !== 3) {
        throw new Error('Invalid number of parameters.');
    }
    const network = process.argv[2];

    const commands = [
        `mustache src/config/contracts.${network}.json subgraph.template.yaml > subgraph.yaml`,
        `mustache src/config/contracts.${network}.json src/utils/helpers.template.ts > src/utils/helpers.ts`,
        `mustache src/config/contracts.${network}.json docker-compose.template.yml > docker-compose.yml`,
    ];

    await Promise.all(
        commands.map((c) => execPromised(c))
    );
})();
