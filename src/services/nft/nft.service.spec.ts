import { expect } from "chai";
import { Request, Response } from "express";

import { queryNfts } from "../../index";

describe("Hello function", () => {
  it("returns hello world", () => {
    const req = {
      body: {
        contractAddress: "test",
      },
    } as Request;
    const res = {
      send: () => {
        console.log("Sent response");
      },
    } as Response;

    expect(queryNfts(req, res)).to.eql("hello, world, the answer is 42");
  });
});
