import "server-only";
import { ProxyAgent } from "undici";

const PROXY_PORTS = [14001, 14002, 14003, 14004, 14005, 14006, 14007, 14008, 14009, 14010];

function getRequiredEnv(name: string): string | undefined {
	const value = process.env[name]?.trim();
	return value ? value : undefined;
}

export function getDecodoProxyDispatcher() {
	const host = getRequiredEnv("DECODO_PROXY_HOST");
	const port = getRequiredEnv("DECODO_PROXY_PORT");
	const username = getRequiredEnv("DECODO_PROXY_USERNAME");
	const password = getRequiredEnv("DECODO_PROXY_PASSWORD");

	if (!host || !port || !username || !password) {
		return undefined;
	}

	const proxyUrl = `http://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}`;
	return new ProxyAgent(proxyUrl);
}

export function getDecodoProxyDispatcherOnPort(port: number) {
	const host = getRequiredEnv("DECODO_PROXY_HOST");
	const username = getRequiredEnv("DECODO_PROXY_USERNAME");
	const password = getRequiredEnv("DECODO_PROXY_PASSWORD");

	if (!host || !username || !password) {
		return undefined;
	}

	const proxyUrl = `http://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}`;
	return new ProxyAgent(proxyUrl);
}

export function getRandomProxyPort() {
	return PROXY_PORTS[Math.floor(Math.random() * PROXY_PORTS.length)];
}
