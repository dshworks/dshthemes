import { test } from "node:test";
import assert from "node:assert/strict";
import { norm } from "../scripts/skin-contract.mjs";

// The 0.1.5 note says every colour token resolves the same as rc.6. That claim
// is only as good as this function: the newer package ships minified CSS, so
// a notation change must compare equal and a real change must not.
test("notation changes compare equal", () => {
  assert.equal(norm("rgba(0, 0, 0, 0.16)"), norm("#00000029"));
  assert.equal(norm("rgba(255, 255, 255, 0.2)"), norm("#fff3"));
  assert.equal(norm("rgb(254, 245, 231)"), norm("#fef5e7"));
  assert.equal(norm("rgba(0, 0, 0, 0)"), norm("transparent"));
  assert.equal(norm("#FFFFFF"), norm("#fff"));
});

test("a stop position is not read as part of the colour", () => {
  assert.equal(
    norm("linear-gradient(180deg, #fff 20.19%, rgba(255, 255, 255, 0) 100%)"),
    norm("linear-gradient(180deg, #fff 20.19%, #fff0 100%)"),
  );
});

test("a real change does not compare equal", () => {
  assert.notEqual(norm("var(--dsw-static-neutral-bluish-100)"), norm("var(--dsw-static-neutral-50)"));
  assert.notEqual(norm("24px"), norm("calc(21px + var(--dsh-content-font-delta))"));
  assert.notEqual(norm("#00000029"), norm("#00000033"));
});
