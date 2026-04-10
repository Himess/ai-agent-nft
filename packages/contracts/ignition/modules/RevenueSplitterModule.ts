import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const RevenueSplitterModule = buildModule("RevenueSplitterModule", (m) => {
  const agentTBA = m.getParameter<string>("agentTBA");
  const founder1 = m.getParameter<string>("founder1");
  const founder2 = m.getParameter<string>("founder2");

  const splitter = m.contract("RevenueSplitter", [agentTBA, founder1, founder2]);

  return { splitter };
});

export default RevenueSplitterModule;
