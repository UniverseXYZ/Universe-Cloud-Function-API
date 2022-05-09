import { expect } from "chai";

import { queryNfts } from "./function";

describe("Hello function", () => {
  it("returns hello world", () => {
    expect(queryNfts()).to.eql("hello, world, the answer is 42");
  });
});
