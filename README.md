# Universe NFT Cloud Function API

## Purpose

The Cloud Function API allows anyone to query our NFT database using a set of query parameters.

## Endpoints

Endpoint: `/nfts`

Because Cloud Functions basically are serverless single endpoint APIs, we use the `action` query parameter as an action router inside the Cloud Function.

### Allowed actions:

`query`: Queries NFT Database
`count`: Queries collection or wallet NFT count

### Allowed query parameters (Count Action):

##### `ownerAddress`: Valid wallet address

- Returns the number of NFT owned by the wallet address

##### `contractAddress`: Valid contract address

- Return the number of NFTs from the contract address

### Allowed query parameters (Query Action):

#### Pagination parameters:

##### `page`: Valid positive integer

##### `limit`: Valid positive integer

### Owner parameters:

##### `ownerAddress`: Valid contract address

### NFT parameters

##### `contractAddress`: Valid contract address

##### `tokenType`: Allowed values: "ERC721", "ERC1155"

##### `searchQuery`: Any valid text.

- Uses Atlas Search Index.
- Current configuration searches for a substring match inside `metadata.name`.
- Can be changed to use autocomplete, fuzzy search or any other valid Atlas Search configuration.

##### `tokenIds`: Any valid string

- Format: `350,1280,4200`

##### `traits`: Attribute-trait key value pairs separated by comma.

- Format: `traits=background:red,background:green,skin:purple`
- In the query above the query will query all nfts with background either red or green AND purple skin
- Case sensitive for both attribute and trait part of the query.

#### `nftSort`: Allowed Values: "5", "6"

- 5 - Token Id ascending
- 6 - Token Id descending

- Note that if you are passing any of the Order parameters, you should be using orderSort for sorting.

### Order parameters

##### `assetClass`: Allowed values: "ERC721", "ERC1155", "ERC721_BUNDLE"

##### `beforeTimestamp`: Valid UTC Timestamp in _seconds_ (Example: 1654761946)

##### `buyNow`: Allowed values: "true"

- Currently not supported as English and Dutch auctions are not impletemented yet.

##### `hasOffers`: Allowed values: "true"

##### `minPrice`: Valid positive number

##### `maxPrice`: Valid positive number

##### `side`: Allowed values: "0" or "1"

- 0 - Buy Orders
- 1 - Sell Orders

##### `maker`: Valid Ethereum wallet address

##### `orderSort`: Allowed Values: "1", "2", "3", "4", "5", "6"

- 1 - Ending Soon
- 2 - Highest Price
- 3 - Lowest Price
- 4 - Recently Listed
- 5 - Token Id ascending
- 6 - Token Id descending

- Note that orderSort is an Order parameter. Specifying orderSort in the request makes the result filtered by the default order filter. If you are pulling NFTs with no attachment to orders, look into the nftSort parameter.

##### `tokenAddress`: Valid ERC20 Token contract address

Currently supported tokens:

- ETH
- WETH
- XYZ
- DAI
- USDC

## Query Strategies

NFTs, Owners and Order are stored in different collections inside the MongoDB Universe Database. Having a unified query strategy wasn't optimal in terms of speed and response time.

That's why depending on the combination of NFT, Owner or Order parameters a specific query strategy is used in order to achieve optimal response time.

#### Current strategies:

- NFT Params
- Owner Params
- Order Params
- NFT + Owner Params
- NFT + Order Params
- Owner + Order Params
- NFT + Owner + Order Params

## Build, test, run, deploy

Yarn is preferred but it usually does not matter that GCF uses NPM to install runtime dependencies.

Install dependencies (locally):

```
yarn
```

Compile the TypeScript and run tests:

```
yarn test
```

Run the function, locally:

```
yarn local:server
```

You can also debug by running the VS Code debugger.
`launch.json` is preconfigured

Note: **Every time you make a change you need to restart the API for the changes to be applied**

Deploy to Google cloud functions:

```
yarn run deploy
```

Deployment command is in `gcf.sh`.

**Note: Currently the deployment variables are hardcoded inside it.**

## Technology stack

- Google Cloud Functions
- TypeScript -> ES2017
- Node 16.14.2
- Mocha+Chai
- Ethers.js
- Mongoose
- MongoDB 5.0.8

## TODO

In the current state of the development `package.json` is copied and included
unchanged as the production `package.json`. In our commercial work, we typically have a more elaborate process to ship a simplified package file that doesn't contain any remains of the development machinery. The idea is to ship the least possible complexity to the deployment environment. For example, the simplified package file would completely omit devDepenencies - although the production mechanism should never install those, if they are emitted from the file then even a bug could never accidentally care about them.

The testing files are currently mixed in with the source code and shipped as part of the function. This is unnecessary, and of the files grew to be more numerous in a real project would use a slightly more complex configuration to keep them segregated.

If I recall right, the source of map files will not actually be used when an error occurs. Additional machinery is required to wire that up, and is worthwhile.

This example does not show calling any Google Cloud services from inside the Cloud Function; most real Cloud Functions call such services. To get started on that, add dependencies on additional packages as described:

https://www.npmjs.com/package/google-cloud

Is better to not depend on the legacy wrapper "google-cloud" package, but rather on the newer, smaller scoped packages (for example, '@google-cloud/storage').

## Credits

Cloud Function template taken from https://github.com/OasisDigital/cloud-function-typescript-example
