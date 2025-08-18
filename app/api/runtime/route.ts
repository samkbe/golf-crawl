export async function GET() {
	const isEdge = !!(globalThis as any).EdgeRuntime;
	return Response.json({
		runtime: isEdge ? "edge" : "node",
		node: (globalThis as any).process?.version ?? null,
	});
}
