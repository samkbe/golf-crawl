import "server-only";
import { ProxyAgent } from "undici";

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
