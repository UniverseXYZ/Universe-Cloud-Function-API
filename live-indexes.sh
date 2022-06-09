// Database Indexes:
// Guidelines:
// 1. Field must be selective enough (https://stackoverflow.com/a/62268015/11808182)
// 2. General order of fields for compound indexex (ESR Rule)  (https://stackoverflow.com/a/62281956/11808182)
// 2.1. fields that have direct match like $eq (E)
// 2.2. fields you sort on (S)
// 2.3. fields with ranged queries: $in, $lt, $or etc (R)
// 2.4  fields from 2.1, 2.2, 2.3 are put in most selective order
//      ie. tokenId is first as it's more selective than contract
// 3. !! Only one multikey field is allowed per index (https://www.mongodb.com/docs/manual/core/index-multikey/#compound-multikey-indexes)

// ORDERS INDEXES
// We don't use "side" and fields in indexes as they are not selective enough
db.getCollection("marketplace-orders").createIndex(
  {
    "make.assetType.tokenId": 1,
    createdAt: -1,
  },
  {
    name: "make.assetType.tokenId_1_createdAt_-1",
  }
);

db.getCollection("marketplace-orders").createIndex(
  {
    "make.assetType.contract": 1,
    createdAt: -1,
  },
  {
    name: "make.assetType.contract_1_createdAt_-1_strength_2",
    collation: { locale: "en", strength: 2 },
  }
);

db.getCollection("marketplace-orders").createIndex(
  {
    "take.assetType.tokenId": 1,
    createdAt: -1,
  },
  {
    name: "take.assetType.tokenId_1_createdAt_-1",
  }
);

db.getCollection("marketplace-orders").createIndex(
  {
    "take.assetType.contract": 1,
    createdAt: -1,
  },
  {
    name: "take.assetType.contract_1_createdAt_-1_strength_2",
    collation: { locale: "en", strength: 2 },
  }
);

db.getCollection("marketplace-orders").createIndex(
  {
    "take.value": 1,
    createdAt: -1,
  },
  {
    name: "take.value_1_createdAt_-1",
  }
);

db.getCollection("marketplace-orders").createIndex(
  {
    "make.assetType.tokenId": 1,
  },
  {
    name: "make.assetType.tokenId_1",
  }
);

db.getCollection("marketplace-orders").createIndex(
  {
    "make.assetType.contract": 1,
  },
  {
    name: "make.assetType.contract_1_strength_2",
    collation: { locale: "en", strength: 2 },
  }
);

db.getCollection("marketplace-orders").createIndex(
  {
    "take.assetType.tokenId": 1,
  },
  {
    name: "take.assetType.tokenId_1",
  }
);

db.getCollection("marketplace-orders").createIndex(
  {
    "take.assetType.contract": 1,
  },
  {
    name: "take.assetType.contract_1_strength_2",
    collation: { locale: "en", strength: 2 },
  }
);

db.getCollection("marketplace-orders").createIndex(
  {
    "take.value": 1,
  },
  {
    name: "take.value_1",
  }
);

// NFT PARAMS INDEXES
// Note: We don't include tokenType in the index combinations
// because it's not selective enough (better performance to make full collection scan)

Combinations using 1 index (4)

db.getCollection("nft-tokens").createIndex({
  "sentForMediaAt": 1,
  },
);

db.getCollection("nft-tokens").createIndex({
  "tokenType": 1,
  },
);

db.getCollection("nft-tokens").createIndex({
  "source": 1,
  },
);

db.getCollection("nft-tokens").createIndex({
  "tokenId": 1,
  },
);

db.getCollection("nft-tokens").createIndex({
  "needToRefresh": 1,
  },
);

db.getCollection("nft-tokens").createIndex({
  "owners.address": 1,
  },
);

db.getCollection("nft-tokens").createIndex({
  "contractAddress": 1,
  "tokenId": 1,
  },
  {unique:true}
);

db.getCollection("nft-tokens").createIndex({
  "source": 1,
  "sentForMediaAt": 1,
  },
  { partialFilterExpression: { metadata: { $exists: true } } }
);

db.getCollection("nft-tokens").createIndex({
  "sentAt": 1,
  "processingSentAt": 1,
  },
);

// DEPLOYED
db.getCollection("nft-tokens").createIndex({
  "contractAddress": 1,
  },
  {
     name: "contractAddress_1_strength_2",
     collation: { locale: "en", strength: 2 }
   }
 );

db.getCollection("nft-tokens").createIndex({
  "tokenId": 1,
  }, {name: "tokenId_1"})

// DEPLOYED
db.getCollection("nft-tokens").createIndex(
  {
    "metadata.name": 1,
  },
  {
    collation: { locale: "en", strength: 2 },
  }
);

// DEPLOYED
Combinations using 2 indexes(6)
db.getCollection("nft-tokens").createIndex(
  {
    contractAddress: 1,
    "metadata.name": 1,
  },
  {
    collation: { locale: "en", strength: 2 },
  }
);

// Deployed
db.getCollection("nft-tokens").createIndex(
  {
    tokenId: 1,
    contractAddress: 1,
  },
  {
    name: "tokenId_1_contractAddress_1_strength_2",
    collation: { locale: "en", strength: 2 },
  }
);

Combinations using 3 indexes (4)
// FOR DEPLOY
db.getCollection("nft-tokens").createIndex(
  {
    tokenId: 1,
    contractAddress: 1,
    "metadata.name": 1,
  },
  {
    name: "tokenId_1_contractAddress_1_metadata.name_1_strength_2",
    collation: { locale: "en", strength: 2 },
  }
);


Combinations using 3 indexes (1)
db.getCollection("nft-tokens").createIndex(
  {
    tokenId: 1,
    contractAddress: 1,
    "owner.address": 1,
    "metadata.name": 1,
  },
  {
    name: "tokenId_1_contractAddress_1_owner.address_1_metadata.name_1_strength_2",
    collation: { locale: "en", strength: 2 },
  }
);

// OWNERS INDEXES

// DEPLOYED
db.getCollection("nft-erc1155-token-owners").createIndex(
  {
    "address": 1,
  },
  {
    name: "address_1_strength_2",
    collation: { locale: "en", strength: 2 },
  }
);

// DEPLOYED
db.getCollection("nft-token-owners").createIndex(
  {
    "address": 1,
  },
  {
    name: "address_1_strength_2",
    collation: { locale: "en", strength: 2 },
  }
);

// nft-block-monitor-tasks
db.getCollection("nft-block-monitor-tasks").createIndex(
  {
    "blockNum": 1,
  }
);

db.getCollection("nft-block-monitor-tasks").createIndex(
  {
    "status": 1,
  }
);

db.getCollection("nft-block-monitor-tasks").createIndex(
  {
    "messageId": 1,
  }
);

// nft-block-tasks

db.getCollection("nft-block-tasks").createIndex(
  {
    "blockNum": 1,
  }
);

db.getCollection("nft-block-tasks").createIndex(
  {
    "status": 1,
  }
);

db.getCollection("nft-block-tasks").createIndex(
  {
    "messageId": 1,
  }
);

//nft-collection-tasks

db.getCollection("nft-collection-tasks").createIndex(
  {
    "status": 1,
  }
);

db.getCollection("nft-collection-tasks").createIndex(
  {
    "messageId": 1,
  }
);

db.getCollection("nft-collection-tasks").createIndex(
  {
    "endBlock": 1,
  }
);

db.getCollection("nft-collection-tasks").createIndex(
  {
    "tokenType": 1,
  }
);

db.getCollection("nft-collection-tasks").createIndex(
  {
    "contractAddress": 1,
  }
);

db.getCollection("nft-collection-tasks").createIndex(
  {
    "startBlock": 1,
  }
);

// nft-collection
db.getCollection("nft-collections").createIndex(
  {
    "contractAddress": 1,
  }
);

db.getCollection("nft-collections").createIndex(
  {
    "tokenType": 1,
  }
);

db.getCollection("nft-collections").createIndex(
  {
    "vip": 1,
  },
  {partialFilterExpression: {vip: {$exists: true}}}
);

db.getCollection("nft-collections").createIndex(
  {
    "isProcessing": 1,
    "vip": 1,
    "lastProcessedBlock": 1
  }
);

db.getCollection("nft-collections").createIndex(
  {
    "ignoreForRetrieveCreatedAtBlock": 1,
    "createdAtBlock": 1,
  }
);

//nft-erc1155-token-owners
db.getCollection("nft-erc1155-token-owners").createIndex(
  {
   "contractAddress": 1,
    "tokenId": 1,
    "address": 1,
    "transactionHash": 1,

  },
  {unique: true}
);

db.getCollection("nft-erc1155-token-owners").createIndex(
  {
    "blockNum": -1,
    "logIndex": -1,
  }
);

db.getCollection("nft-erc1155-token-owners").createIndex(
  {
    "address": 1,
  },
  {"locale": 'en', "strength": 2}
);

// nft-token-owners

db.getCollection("nft-token-owners").createIndex(
  {
    "blockNum": -1,
    "logIndex": -1,
  }
);


db.getCollection("nft-token-owners").createIndex(
  {
    "address": 1,
  }
);

db.getCollection("nft-token-owners").createIndex(
  {
    "contractAddress": 1,
    "tokenId": 1,
  },
  {unique: true}
);

db.getCollection("nft-token-owners").createIndex(
  {
   "contractAddress": 1,
    "tokenId": 1,
    "address": 1,
    "transactionHash": 1,

  },
  {unique: true}
);


db.getCollection("nft-token-owners").createIndex(
  {
    "address": 1,
  },
  {"locale": 'en', "strength": 2}
);

// nft-token-owners-tasks

db.getCollection("nft-token-owners-tasks").createIndex(
  {
    "taskId": 1,
  },
);

db.getCollection("nft-token-owners-tasks").createIndex(
  {
    "isProcessing": 1,
  },
);

db.getCollection("nft-token-owners-tasks").createIndex(
  {
    "tokenId": 1,
  },
);

db.getCollection("nft-token-owners-tasks").createIndex(
  {
    "contractAddress": 1,
    "tokenId": 1,
    "taskId": 1,
  },
);

db.getCollection("nft-token-owners-tasks").createIndex(
  {
    "priority": 1,
  },
);

db.getCollection("nft-token-owners-tasks").createIndex(
  {
    "isProcessing": 1,
    "priority": -1,
    "createdAt": -1,
  },
);

db.getCollection("nft-token-owners-tasks").createIndex(
  {
    "contractAddress": 1,
  },
);

db.getCollection("nft-token-owners-tasks").createIndex(
  {
    "isProcessing": 1,
    "tokenType": 1,
    "priority": -1,
    "createdAt": -1
  },
);

// nft-transfer-histories

db.getCollection("nft-transfer-histories").createIndex(
  {
    "contractAddress": 1,
    "tokenId": 1,
    "hash": 1,
  },
);

db.getCollection("nft-transfer-histories").createIndex(
  {
    "contractAddress": 1,
    "tokenId": 1,
    "hash": 1,
    "logIndex": 1
  },
  {unique: true}
);    

db.getCollection("nft-transfer-histories").createIndex(
  {
    "blockNum": 1,
    "logIndex": 1
  }
); 
