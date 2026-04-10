import { getContracts, TAGS } from "../../chain/contracts.js";
import { getConfig } from "../../config.js";
import { saveReputationLog } from "../../storage/database.js";
import { getLogger } from "../../utils/logger.js";

/**
 * Batch write reputation entries to on-chain.
 * Runs every 30 minutes — batches pending decisions into on-chain writes.
 */
export async function reputationTask(): Promise<void> {
  const log = getLogger();
  const config = getConfig();

  try {
    const { agentIdentity } = getContracts();
    const agentId = config.AGENT_ID;

    // Get current on-chain reputation count
    const onChainCount = await agentIdentity.getReputationCount(agentId);
    const info = await agentIdentity.getAgentInfo(agentId);

    log.info(
      {
        agentId,
        reputationScore: info.reputationScore.toString(),
        totalDecisions: info.totalDecisions.toString(),
        onChainCount: onChainCount.toString(),
      },
      "Reputation sync check"
    );
  } catch (err) {
    log.error({ err }, "Reputation task failed");
  }
}

/**
 * Write a single reputation entry on-chain.
 */
export async function writeReputation(
  score: number,
  tag: string,
  reason: string
): Promise<string | null> {
  const log = getLogger();
  const config = getConfig();

  try {
    const { agentIdentity } = getContracts();
    const tx = await agentIdentity.updateReputation(
      config.AGENT_ID,
      score,
      tag,
      reason
    );
    const receipt = await tx.wait();

    saveReputationLog({
      agentId: config.AGENT_ID,
      score,
      tag,
      reason,
      txHash: receipt.hash,
    });

    log.info({ txHash: receipt.hash, score, tag }, "Reputation written on-chain");
    return receipt.hash;
  } catch (err) {
    log.error({ err, score, tag }, "Failed to write reputation on-chain");
    return null;
  }
}
