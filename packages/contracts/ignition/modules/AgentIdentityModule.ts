import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const AgentIdentityModule = buildModule("AgentIdentityModule", (m) => {
  const identity = m.contract("AgentIdentity");
  return { identity };
});

export default AgentIdentityModule;
