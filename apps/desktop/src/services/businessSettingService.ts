import { apiRequest } from "../lib/api";

import type {
  BusinessSettingInput,
  BusinessSettingResponse,
} from "../types/businessSetting";

export function getBusinessSettings(
  token: string
): Promise<BusinessSettingResponse> {
  return apiRequest<BusinessSettingResponse>("/business-settings", {
    method: "GET",
    token,
  });
}

export function updateBusinessSettings(
  token: string,
  values: BusinessSettingInput
): Promise<BusinessSettingResponse> {
  return apiRequest<BusinessSettingResponse>("/business-settings", {
    method: "PUT",
    token,
    body: JSON.stringify(values),
  });
}
