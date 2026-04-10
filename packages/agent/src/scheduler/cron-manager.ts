import cron from "node-cron";
import { tweetTask } from "./tasks/tweet-task.js";
import { mentionTask } from "./tasks/mention-task.js";
import { reputationTask } from "./tasks/reputation-task.js";
import { getLogger } from "../utils/logger.js";

interface ScheduledTask {
  name: string;
  schedule: string; // cron expression
  handler: () => Promise<void>;
}

const tasks: ScheduledTask[] = [
  {
    name: "tweet",
    schedule: "*/36 * * * *", // Every 36 minutes (~40/day)
    handler: tweetTask,
  },
  {
    name: "mentions",
    schedule: "*/5 * * * *", // Every 5 minutes
    handler: mentionTask,
  },
  {
    name: "reputation",
    schedule: "*/30 * * * *", // Every 30 minutes
    handler: reputationTask,
  },
];

const activeJobs: ReturnType<typeof cron.schedule>[] = [];

/**
 * Start all scheduled tasks.
 */
export function startScheduler(): void {
  const log = getLogger();

  for (const task of tasks) {
    const job = cron.schedule(task.schedule, async () => {
      log.debug({ task: task.name }, "Task triggered");
      try {
        await task.handler();
      } catch (err) {
        log.error({ err, task: task.name }, "Scheduled task error");
      }
    });

    activeJobs.push(job);
    log.info({ task: task.name, schedule: task.schedule }, "Task scheduled");
  }

  log.info(`${tasks.length} tasks scheduled`);
}

/**
 * Stop all scheduled tasks.
 */
export function stopScheduler(): void {
  for (const job of activeJobs) {
    job.stop();
  }
  activeJobs.length = 0;
  getLogger().info("Scheduler stopped");
}
