import { Request, Response } from "express";

import { queryNfts } from "./index";

// These fakes are a long way from semantically or mechanically meeting the same
// interface as the express request and response, so we just force them with a
// typecast for a quick run harness.

// I think there is better testing machinery available that produces the correct
// types also to avoid this.

const fakeReq = <Request>{
  query: {
    ownerAddress: "0x6FB3946CCc1a4b04FE49ce3e591C15f496C73881",
    tokenAddress: "",
    tokenType: "",
    searchQuery: "",
    page: 1,
    limit: 10,
    dataSources: "",
    side: "",
    assetClass: "",
    tokenIds: "",
    beforeTimestamp: "",
    token: "",
    minPrice: "",
    maxPrice: "",
    sortBy: "",
    hasOffers: "",
  },
};

const fakeResponse = <Response>{
  send: (x: string) => console.log("output", x),
  status: (x: number) => console.log("status", x),
};

queryNfts(fakeReq, fakeResponse);
