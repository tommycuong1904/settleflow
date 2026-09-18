import assert from "node:assert/strict";
import test from "node:test";

import {
  CIRCLE_ARC_TESTNET,
  assertArcSmartWallet,
  selectArcSmartWallet,
  type CircleWallet,
} from "@/lib/circle/user-controlled";

const arcSmartWallet: CircleWallet = {
  id: "wallet-1",
  address: "0x1111111111111111111111111111111111111111",
  blockchain: CIRCLE_ARC_TESTNET,
  accountType: "SCA",
};

test("Circle user-controlled wallet selection accepts only Arc Testnet SCAs", () => {
  assert.equal(selectArcSmartWallet([{ ...arcSmartWallet, accountType: "EOA" }, arcSmartWallet]), arcSmartWallet);
  assert.equal(selectArcSmartWallet([{ ...arcSmartWallet, blockchain: "ETH-SEPOLIA" }]), null);
});

test("Circle user-controlled wallet validation rejects a non-Arc or non-SCA source", () => {
  assert.doesNotThrow(() => assertArcSmartWallet(arcSmartWallet));
  assert.throws(() => assertArcSmartWallet({ ...arcSmartWallet, accountType: "EOA" }), /CIRCLE_ARC_SMART_WALLET_REQUIRED/);
  assert.throws(() => assertArcSmartWallet({ ...arcSmartWallet, blockchain: "ETH-SEPOLIA" }), /CIRCLE_ARC_SMART_WALLET_REQUIRED/);
});
