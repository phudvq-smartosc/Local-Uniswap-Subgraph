- Note anh Cuong: 
    1. Haven't add RPC in docker compose, 
    2. Add Factory Contract address to PairV2Deployment.s.sol 
    3. Add Factory Contract address to helper.ts && subgraph.yaml
    4. Haven't add startblock in subgraph.yaml, 
    
- Clone embedded git repo:
    1. git clone https://github.com/graphprotocol/graph-node.git

    2. git clone https://github.com/foundry-rs/forge-std.git
- Reset scripts
    1. Remove all Docker images, docker containers
        
        ```jsx
        docker rmi -f $(docker images -aq)
        docker rm -v -f $(docker ps -qa)
        ```
        
    
- Step 1. Run local chain with Anvil
    - [ ]  Create new terminal to set it up
    - [ ]  *scripts:*
        
        ```jsx
        anvil --dump-state ./blockscan/state.json --host 0.0.0.0
        ```
        
- Step 2: Run Local Graph Node
    
    *Host the Subgraph* 
    
    - [ ]  Create new terminal to set up
    - [ ]  Run command
        
        ```jsx
        cd graph-node/docker
        ./setup.sh
        ```
        
        ```java
        docker compose up (or docker-compose up?)
        ```
        
- Step 3: Deploy contracts
    - [ ]  Create new terminal to set up
    - [ ]  *scripts:*
        
        ```jsx
        cd uniswapContract
        
        source ./.env 
        
        forge script script/ERC20SetupDeployment.s.sol:ERC20SetupDeployment --fork-url $FORK_URL --broadcast --private-key $PRIVATE_KEY 
        ```
        
    - [ ]  Get Contract addresses to set contract pair
    - [ ]  *scripts:*
        - [ ]  Set up 5 ERC20 contract
        
        ```java
        forge script script/ERC20SetupDeployment.s.sol:ERC20SetupDeployment --fork-url $FORK_URL --broadcast --private-key $PRIVATE_KEY
        ```
        
        - [ ]  Set up Factory && Router Contract
        
        ```java
        forge script script/UniswapV2Deployment.s.sol:UniswapV2Deployment --fork-url $FORK_URL --broadcast --private-key $PRIVATE_KEY
        ```
        
        - [ ]  Set up Pair contract
            - [ ]  Add factory address to PairV2Deployment.s.sol
        
        ```jsx
        forge script script/PairV2Deployment.s.sol:PairV2Deployment --fork-url $FORK_URL --broadcast --private-key $PRIVATE_KEY
        ```
        
- Step 4: Run Subgraph
    - [ ]  Add factory token address into helper.ts
    - [ ]  Add factory token address into subgraph.yaml
    - [ ]  Script
        
        ```jsx
        npm run codegen
        npm run build
        
        // register subgraph name in the graph node
        npm run create-local
        npm run deploy-local
        ```
- Step 5: Run Test Query
    
    ```java
    {
    	ZuniswapV2Factory {
    		id
    	}
    }
    ```