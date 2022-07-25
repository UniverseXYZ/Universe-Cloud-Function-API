import { expect } from 'chai';
import { NFTCollectionAttributesModel } from '../../models';
import { getTokenIdsByCollectionAttributes } from './attributes.service';
import { DBhandler } from '../../tests/DBhandler';

let mongod = null;

before(async () => {
  mongod = await DBhandler();
  await mongod.start();
});

describe('getTokenIdsByCollectionAttributes', () => {
  const documents = [
    {
      contractAddress: '0x2b7DD23595aC4c25e98dEf9D53ad2f455C6fE0E1',
      attributes: {
        dna: {
          human: ['1', '2', '3'],
          robot: ['4', '5', '6', '7'],
        },
      },
    },
    {
      contractAddress: '0x69898c16f9153950cf07b9Db36A0f3AEb2F51372',
      attributes: {
        background: {
          red: ['1', '2', '3'],
          blue: ['4', '5', '6', '7'],
        },
      },
    },
  ];
  it('should return the correct token ids', async () => {
    await NFTCollectionAttributesModel.insertMany(documents);

    const result = await getTokenIdsByCollectionAttributes(
      '0x2b7DD23595aC4c25e98dEf9D53ad2f455C6fE0E1',
      'dna:robot,dna:human',
    );

    expect(result).to.be.an('array');
    expect(result).deep.equal(['4', '5', '6', '7', '1', '2', '3']);
  });

  it('should return an empty array', async () => {
    await NFTCollectionAttributesModel.insertMany(documents);

    const result = await getTokenIdsByCollectionAttributes(
      '0x2b7DD23595aC4c25e98dEf9D53ad2f455C6fE0E1',
      'dna:ngmi',
    );

    expect(result).deep.equal([]);
  });
});

after(async () => {
  await mongod.stop();
});
