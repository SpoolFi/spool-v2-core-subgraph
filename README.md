# Spool V2 Core Subgraph

Subgraph for SpoolFi V2 Core contracts.

## Install (Debian based distro)

### Install Docker

#### Update and Install Packages

```
sudo apt-get update
sudo apt-get install ca-certificates curl
```

#### Get Docker Keyring and Install

```
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo   "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
   $(. /etc/os-release && echo "$VERSION_CODENAME") stable" |   sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

#### Update
```
sudo apt-get update
```

#### Get And Install Docker Repositories (Should also start Docker)
```
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable docker
```

#### (Possibly needed) Fix Permissions
```
sudo apt install acl
sudo setfacl --modify user:admin:rw /var/run/docker.sock
```

### Install Git
```
sudo apt install git-all
```

### Clone
```
https://github.com/SpoolFi/spool-v2-core-subgraph/
```

### Install
```
npm install
```

## Config
### Environment Variables
```
cp .env.example .env
```

### Edit
- Update `.env` as necessary. Eg. if you deploy to Alchemy, insert your alchemy access token, for Studio insert your studio access token, etc.
- Insert RPCs if you intend to deploy locally, or to a custom remote node. The docker instance needs this to index. If you are using a custom subgraph provider such as Alchemy or the Studio, this is not necessary.
- `src/config/contracts.*.json` contains contracts for each network. update these as needed. if you just want to deploy to mainnet production, the existing contracts do not need to be modified.

## Deploy

### Deploy Remote (Mainnet) 
- Staging on Alchemy: `npm run mainnet-staging:deploy-alchemy`
- Production on Alchemy: `npm run mainnet-prod:deploy-alchemy`
- Production on Studio: `npm run mainnet-prod:deploy-studio`

### Deploy Local
- populate `src/config/contracts.local.template.json` with addresses to deploy.
    - if the address list is one of `src/config/contracts.{NETWORK}.json`, you can replace `local` in the script `local:codegen` in `package.json` with `{NETWORK}`. eg. for `src/config/contracts.mainnet.production.json`: replace `local` in the `local:codegen` script with `mainnet.production` to use the `mainnet.production` addresses.
- Update the `RPC_LOCAL` environment variable to the RPC of the network you wish to deploy to. Alternatively, you can leave this as the default, but this expects that you are running a custom node at this address (`http://host.docker.internal:8545`).
- `docker compose down`
- delete folders `build/ generated/ data/`
- `npm run local:build`
- `docker compose up -d`
- `npm run local:create`
- `npm run local:deploy`
- `docker compose logs --follow`
