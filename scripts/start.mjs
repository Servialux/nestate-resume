// Adapter-node defaults to 512 KB. Allow the 50 MB image endpoint, whose own
// streaming limit still applies; deployments may set a stricter explicit limit.
process.env.BODY_SIZE_LIMIT ||= '52M';
await import('../build/index.js');
