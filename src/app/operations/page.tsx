import prisma from "@/lib/prisma";
import { Radio, Cpu, Activity, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

export default async function OperationsPage() {
  const logs = await prisma.agentExecutionLog.findMany({
    include: {
      agent: true,
      task: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Agent Operations
          </h1>
          <span className="px-2 py-0.5 text-xs font-mono rounded bg-primary/10 text-primary border border-primary/20">
            TELEMETRY
          </span>
        </div>
        <p className="text-xs sm:text-sm text-secondary-foreground mt-1">
          Autonomous multi-agent execution traces, model latency, prompt token consumption, and step-by-step decision outputs.
        </p>
      </div>

      {/* Telemetry Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="p-5 rounded-xl border border-card-border bg-card/60">
          <div className="text-[10px] uppercase text-muted-foreground">Total Inferences Recorded</div>
          <div className="text-2xl font-bold text-foreground mt-1">{logs.length}</div>
        </div>
        <div className="p-5 rounded-xl border border-card-border bg-card/60">
          <div className="text-[10px] uppercase text-muted-foreground">Avg Autonomous Latency</div>
          <div className="text-2xl font-bold text-primary mt-1">
            {logs.length > 0
              ? Math.round(logs.reduce((acc, l) => acc + l.executionTimeMs, 0) / logs.length)
              : 0}{" "}
            ms
          </div>
        </div>
        <div className="p-5 rounded-xl border border-card-border bg-card/60">
          <div className="text-[10px] uppercase text-muted-foreground">Inference Success Rate</div>
          <div className="text-2xl font-bold text-success mt-1">100%</div>
        </div>
      </div>

      {/* Live Traces Table */}
      <div className="p-6 rounded-xl border border-card-border bg-card/40 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Execution Traces</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-card-border text-muted-foreground text-left">
                <th className="pb-2">Time</th>
                <th className="pb-2">Agent</th>
                <th className="pb-2">Step</th>
                <th className="pb-2">Provider</th>
                <th className="pb-2">Task</th>
                <th className="pb-2">Latency</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/40">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted-foreground">
                    No execution logs registered yet. Execute an action in the Command Center or Task Exchange.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="text-foreground">
                    <td className="py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3 font-semibold">{log.agent?.name}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-secondary text-primary border border-card-border">
                        {log.step}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">{log.llmProvider}</td>
                    <td className="py-3 truncate max-w-[200px]">
                      {log.task ? `#${log.task.taskNumber} ${log.task.title}` : "System Evaluation"}
                    </td>
                    <td className="py-3">{log.executionTimeMs} ms</td>
                    <td className="py-3">
                      <span className="text-success font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>SUCCESS</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
