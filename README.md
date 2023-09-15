# Spool V2 Core Subgraph

# Install
- Install Docker
- Install Git
- clone
- `npm install`

# Deploy Local
- populate `src/config/contracts.local.json` with addresses to deploy.
    - if the address list is one of `src/config/contracts.{NETWORK}.json`, you can replace `local` in the script `local:codegen` in `package.json` with `{NETWORK}`. eg. for `src/config/contracts.devnet-10.json`: replace `local` in the `local:codegen` script with `devnet-10` to use the `devnet-10` addresses.
- `docker-compose down`
- delete folders `build/ generated/ data/`
- `docker-compose up -d`
- `npm run local:build`
- `npm run local:create`
- `npm run local:deploy`
- `docker logs --follow spool-v2-core-subgraph_graph-node_1`

# Deploy Remote (Tenderly)
- `REMOTE` should be one of `{staging|testing}`
- Update `$REMOTE:codegen` in `package.json` with your chosen devnet (the latest devnet is always set)
- `npm run $REMOTE:build`
- `npm run $REMOTE:create`
- `npm run $REMOTE:deploy`

# Deploy Remote (Mainnet) 
- Staging to Satsuma: `npm run mainnet-staging:deploy-satsuma`
- Production to Satsuma: `npm run mainnet-prod:deploy-satsuma`
- Production to Hosted Service: `npm run mainnet-prod:deploy-hosted`
- Production to Decentralized Service: `npm run mainnet-prod:deploy-studio`

## Query Local

- go to: https://graphiql-online.com/
  - input http://127.0.0.1:8000/subgraphs/name/spool/core-v2
