/**
 * Re-export alias: /api/process → /api/pipeline/process
 * The upload page calls /api/process; this bridges it to the actual pipeline route.
 */
import { POST } from "../pipeline/process/route";
export { POST };
export const runtime = "nodejs";
export const maxDuration = 120;
