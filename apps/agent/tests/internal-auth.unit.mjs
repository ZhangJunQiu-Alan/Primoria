import assert from "node:assert/strict";
import {
  getAgentInternalToken,
  inputMatchesOwner,
  isAuthorizedAgentRequest,
  ownerIdFromRequest,
} from "../src/runtime/internal-auth.mjs";

process.env.PRIMORIA_AGENT_INTERNAL_SECRET = "test-secret";
assert.equal(getAgentInternalToken(), "test-secret");
assert.equal(isAuthorizedAgentRequest({ headers: { "x-primoria-agent-token": "test-secret" } }), true);
assert.equal(isAuthorizedAgentRequest({ headers: { "x-primoria-agent-token": "wrong" } }), false);
assert.equal(ownerIdFromRequest({ headers: { "x-primoria-owner-id": "owner-1" } }), "owner-1");

const input = {
  state: { primoria_owner_id: "owner-1", user_id: "owner-1" },
  forwardedProps: { config: { metadata: { primoria_owner_id: "owner-1" } } },
};
assert.equal(inputMatchesOwner(input, "owner-1"), true);
assert.equal(inputMatchesOwner(input, "owner-2"), false);
assert.equal(inputMatchesOwner({ state: {} }, "owner-1"), false);

process.stdout.write("[internal-auth.unit] ALL CHECKS PASSED\n");
