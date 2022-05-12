// Database Indexes:
// Guidelines:
// 1. Field must be selective enough (https://stackoverflow.com/a/62268015/11808182)
// 2. General order of fields for compound indexex  (https://stackoverflow.com/a/62281956/11808182)
// 2.1. fields that have direct match like $eq
// 2.2. fields you sort on
// 2.3. fields with ranged queries: $in, $lt, $or etc
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
  "contractAddress": 1,
  },
  {
     name: "contractAddress_1_strength_2",
     collation: { locale: "en", strength: 2 }
   }
 );



db.getCollection("nft-tokens").createIndex(
  {
    "owners.address": 1,
  },
  {
    name: "owners.address_1_strength_2",
    collation: { locale: "en", strength: 2 },
  }
);

db.getCollection("nft-tokens").createIndex({
  "tokenId": 1,
  }, {name: "tokenId_1"})

db.getCollection("nft-tokens").createIndex(
  {
    "metadata.name": 1,
  },
  {
    name: "metadata_name_1_strength_2",
    collation: { locale: "en", strength: 2 },
  }
);

Combinations using 2 indexes(6)
db.getCollection("nft-tokens").createIndex(
  {
    contractAddress: 1,
    "metadata.name": 1,
  },
  {
    name: "contractAddress_1_metadata.name_1_strength_2",
    collation: { locale: "en", strength: 2 },
  }
);

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

db.getCollection("nft-tokens").createIndex(
  {
    "owners.address": 1,
    contractAddress: 1,
  },
  {
    name: "owners.address_1_contractAddress_1_strength_2",
    collation: { locale: "en", strength: 2 },
  }
);

db.getCollection("nft-tokens").createIndex(
  {
    "owners.address": 1,
    tokenId: 1,
  },
  {
    name: "owners.address_1_tokenId_1_strength_2",
    collation: { locale: "en", strength: 2 },
  }
);

db.getCollection("nft-tokens").createIndex(
  {
    "owners.address": 1,
    "metadata.name": 1,
  },
  {
    name: "owners.address_1_metadata.name_1_strength_2",
    collation: { locale: "en", strength: 2 },
  }
);

db.getCollection("nft-tokens").createIndex(
  {
    tokenId: 1,
    "metadata.name": 1,
  },
  { name: "tokenId_1_metadata.name_1" }
);

Combinations using 3 indexes (4)
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

db.getCollection("nft-tokens").createIndex(
  {
    "owner.address": 1,
    contractAddress: 1,
    "metadata.name": 1,
  },
  {
    name: "owner.address_1_contractAddress_1_metadata.name_1_strength_2",
    collation: { locale: "en", strength: 2 },
  }
);

db.getCollection("nft-tokens").createIndex(
  {
    tokenId: 1,
    "owner.address": 1,
    "metadata.name": 1,
  },
  {
    name: "tokenId_1_owner.address_1_metadata.name_1_strength_2",
    collation: { locale: "en", strength: 2 },
  }
);

db.getCollection("nft-tokens").createIndex(
  {
    tokenId: 1,
    contractAddress: 1,
    "owner.address": 1,
  },
  {
    name: "tokenId_1_contractAddress_1_owner.address_1_strength_2",
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
db.getCollection("nft-erc1155-token-owners").createIndex(
  {
    "address": 1,
  },
  {
    name: "address_1_strength_2",
    collation: { locale: "en", strength: 2 },
  }
);
\
db.getCollection("nft-token-owners").createIndex(
  {
    "address": 1,
  },
  {
    name: "address_1_strength_2",
    collation: { locale: "en", strength: 2 },
  }
);