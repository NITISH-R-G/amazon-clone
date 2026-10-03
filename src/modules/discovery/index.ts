// Public interface of the discovery module. Import only from here.
export { createDiscovery } from "./internal/discovery";
export type { Discovery, DiscoveryDeps } from "./internal/discovery";
export { rank, scoreCandidate } from "./score";
export type { Candidate, Signals } from "./score";
