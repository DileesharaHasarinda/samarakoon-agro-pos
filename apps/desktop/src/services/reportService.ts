import { apiRequest } from "../lib/api";

import type { ReportOverviewResponse, ReportParameters } from "../types/report";

export async function getReportOverview(
  token: string,
  parameters: ReportParameters
): Promise<ReportOverviewResponse> {
  const query = new URLSearchParams();

  query.set("date_from", parameters.dateFrom);

  query.set("date_to", parameters.dateTo);

  if (parameters.paymentMethod) {
    query.set("payment_method", parameters.paymentMethod);
  }

  if (parameters.paymentStatus) {
    query.set("payment_status", parameters.paymentStatus);
  }

  return apiRequest<ReportOverviewResponse>(
    `/reports/overview?${query.toString()}`,
    {
      method: "GET",
      token,
    }
  );
}
