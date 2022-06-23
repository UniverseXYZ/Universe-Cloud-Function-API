import { expect } from 'chai';
import { Request, Response } from 'express';

import { nfts } from '../../index';

describe('Hello function', () => {
  it('returns hello world', () => {
    const req = {
      body: {
        contractAddress: 'test',
      },
    } as Request;
    const res = {
      send: () => {
        console.log('Sent response');
      },
    } as Response;

    expect(nfts(req, res)).to.eql('hello, world, the answer is 42');
  });
});
