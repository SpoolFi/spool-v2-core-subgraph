# Spool V2 Core Subgraph

# Install
- Install Docker
- clone
- `npm install`

# Run local
- `NETWORK={network_id} && npm run mustache`

    - `network_id` is one of `src/config/contracts.{network_id}.json`.

- `docker-compose down`
- `sudo rm -rf build/ generated/ data/`
- `docker-compose up -d`
- `npm run local:build`
- `npm run local:create`
- `npm run local:deploy`
- `docker logs --follow spool-v2-core-subgraph_graph-node_1`

# Run Remote
- `REMOTE={staging|testing}`
- `npm run $REMOTE:build`
- `npm run $REMOTE:create`
- `npm run $REMOTE:deploy`

## Query Local

- go to: https://graphiql-online.com/
  - input http://127.0.0.1:8000/subgraphs/name/spool/core-v2
