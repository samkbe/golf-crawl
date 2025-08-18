export async function GET() {
	const isEdge = typeof (globalThis as { EdgeRuntime?: unknown }).EdgeRuntime !== "undefined";

	// process is only defined in Node
	const nodeVersion =
		typeof process !== "undefined" && "version" in process ? process.version : null;

	return Response.json({
		runtime: isEdge ? "edge" : "node",
		node: nodeVersion,
	});
}
