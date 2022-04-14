import { Model, model  } from 'mongoose';

import {
    NFTCollection,
    NFTCollectionSchema,
  } from 'datascraper-schema';


const CollectionModel: Model<NFTCollection> = model<NFTCollection>('Collection', NFTCollectionSchema, 'nft-collections');
export default CollectionModel;