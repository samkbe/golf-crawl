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

		let pid1Comm: string | null = null;
		let pid1Exe: string | null = null;
		let pid1Cmdline: string | null = null;
		let defunctCount: number | null = null;
		try { pid1Comm = fs.readFileSync("/proc/1/comm", "utf8").trim(); } catch {}
		try { pid1Exe = fs.readlinkSync("/proc/1/exe"); } catch {}
		try { pid1Cmdline = fs.readFileSync("/proc/1/cmdline", "utf8").replace(/\0/g, " ").trim(); } catch {}
		try {
			let zombies = 0;
			for (const name of fs.readdirSync("/proc")) {
				if (!/^\d+$/.test(name)) continue;
				try {
					const stat = fs.readFileSync(`/proc/${name}/stat`, "utf8");
					const m = stat.match(/\) (\S)/);
					if (m && m[1] === "Z") zombies += 1;
				} catch {}
			}
			defunctCount = zombies;
		} catch {}

		return {
			memMB,
			pidCount,
			chromePidCount,
			xvfbPidCount,
			meminfo,
			cgroupLimit,
			cgroupCurrent,
			pidsCurrent,
			pidsMax,
			pid1Comm,
			pid1Exe,
			pid1Cmdline,
			defunctCount,
			nodePid: process.pid,
		};
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

export function getChromiumPids(): Set<number> {
	try {
		const out = execSync("pgrep -x chromium || true", { stdio: ["ignore", "pipe", "ignore"] }).toString();
		return new Set(
			out.split("\n").map((s) => s.trim()).filter(Boolean).map((s) => parseInt(s, 10)).filter((n) => Number.isFinite(n))
		);
	} catch {
		return new Set();
	}
}

export function getProcessStates(pids: number[]): Record<string, string> {
	const result: Record<string, string> = {};
	for (const pid of pids) {
		try {
			const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
			const match = stat.match(/\) (\S)/);
			result[String(pid)] = match ? match[1] : "?";
		} catch {
			result[String(pid)] = "missing";
		}
	}
	return result;
}
// #endregion
