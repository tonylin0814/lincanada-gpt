export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { GET as downloadPdf } from "../print/route";

type RouteContext = { params: { record_r_number: string } };

export function GET(request: Request, context: RouteContext) {
  return downloadPdf(request, context);
}
