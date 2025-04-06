import NodeCache from "node-cache";
import type { TeeTime } from "./types";
export const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes