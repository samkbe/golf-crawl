// #region agent log
import { execSync } from "node:child_process";
import fs from "node:fs";

const SESSION_ID = "4435b4";
const TAG = `[DEBUG-${SESSION_ID}]`;
const INGEST_URL = process.env.DEBUG_INGEST_URL || "http://127.0.0.1:7371/ingest/957049a3-1bb7-4224-980c-68ee5079143e";

function snapshotProcess() {
	try {
		const mu = process.memoryUsage();
		const memMB = {
			rss: Math.round(mu.rss / 1024 / 1024),
			heapUsed: Math.round(mu.heapUsed / 1024 / 1024),
			heapTotal: Math.round(mu.heapTotal / 1024 / 1024),
			external: Math.round(mu.external / 1024 / 1024),
		};

		let pidCount: number | null = null;
		let chromePidCount: number | null = null;
		let xvfbPidCount: number | null = null;
		let meminfo: Record<string, string> | null = null;
		let cgroupLimit: string | null = null;
		let cgroupCurrent: string | null = null;
		let pidsCurrent: string | null = null;
		let pidsMax: string | null = null;
		try {
			pidCount = fs.readdirSync("/proc").filter((n) => /^\d+$/.test(n)).length;
		} catch {}
		try {
			chromePidCount = parseInt(execSync("pgrep -c chromium || pgrep -c chrome || echo 0", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(), 10);
		} catch {}
		try {
			xvfbPidCount = parseInt(execSync("pgrep -c Xvfb || echo 0", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(), 10);
		} catch {}
		try {
			const mi = fs.readFileSync("/proc/meminfo", "utf8").split("\n").slice(0, 5);
			meminfo = Object.fromEntries(mi.filter(Boolean).map((l) => { const [k, ...v] = l.split(":"); return [k.trim(), v.join(":").trim()]; }));
		} catch {}
		try { cgroupLimit = fs.readFileSync("/sys/fs/cgroup/memory.max", "utf8").trim(); } catch {}
		try { cgroupCurrent = fs.readFileSync("/sys/fs/cgroup/memory.current", "utf8").trim(); } catch {}
		try { pidsCurrent = fs.readFileSync("/sys/fs/cgroup/pids.current", "utf8").trim(); } catch {}
		try { pidsMax = fs.readFileSync("/sys/fs/cgroup/pids.max", "utf8").trim(); } catch {}

		return { memMB, pidCount, chromePidCount, xvfbPidCount, meminfo, cgroupLimit, cgroupCurrent, pidsCurrent, pidsMax };
	} catch (e) {
		return { snapshotError: String(e) };
	}
}

export function dbg(location: string, message: string, data: Record<string, unknown> = {}, hypothesisId?: string) {
	const payload = {
		sessionId: SESSION_ID,
		hypothesisId,
		timestamp: Date.now(),
		location,
		message,
		data: { ...data, snapshot: snapshotProcess() },
	};
	try { console.log(`${TAG} ${JSON.stringify(payload)}`); } catch {}
	try {
		fetch(INGEST_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json", "X-Debug-Session-Id": SESSION_ID },
			body: JSON.stringify(payload),
		}).catch(() => {});
	} catch {}
}

let inflight = 0;
export function incInflight() { inflight += 1; return inflight; }
export function decInflight() { inflight = Math.max(0, inflight - 1); return inflight; }
export function getInflight() { return inflight; }
// #endregion
