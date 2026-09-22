import { apiRequest } from "../lib/api";

import type {
  DeleteProductUnitResponse,
  ProductUnitInput,
  ProductUnitListParameters,
  ProductUnitListResponse,
  ProductUnitOptionsResponse,
  ProductUnitResponse,
} from "../types/productUnit";

function buildQuery(
  parameters: ProductUnitListParameters
): string {
  const query = new URLSearchParams();

  query.set(
    "page",
    String(parameters.page ?? 1)
  );

  query.set(
    "per_page",
    String(parameters.perPage ?? 20)
  );

  const search =
    parameters.search?.trim();

  if (search) {
    query.set(
      "search",
      search
    );
  }

  return query.toString();
}

function payload(
  values: ProductUnitInput
) {
  return {
    name: values.name.trim(),
  };
}

export function getProductUnits(
  token: string,
  parameters: ProductUnitListParameters = {}
): Promise<ProductUnitListResponse> {
  const query =
    buildQuery(
      parameters
    );

  return apiRequest<ProductUnitListResponse>(
    `/product-units?${query}`,
    {
      method: "GET",
      token,
    }
  );
}

export function getProductUnitOptions(
  token: string
): Promise<ProductUnitOptionsResponse> {
  return apiRequest<ProductUnitOptionsResponse>(
    "/product-units/options",
    {
      method: "GET",
      token,
    }
  );
}

export function createProductUnit(
  token: string,
  values: ProductUnitInput
): Promise<ProductUnitResponse> {
  return apiRequest<ProductUnitResponse>(
    "/product-units",
    {
      method: "POST",
      token,

      body: JSON.stringify(
        payload(
          values
        )
      ),
    }
  );
}

export function updateProductUnit(
  token: string,
  productUnitId: number,
  values: ProductUnitInput
): Promise<ProductUnitResponse> {
  return apiRequest<ProductUnitResponse>(
    `/product-units/${productUnitId}`,
    {
      method: "PUT",
      token,

      body: JSON.stringify(
        payload(
          values
        )
      ),
    }
  );
}

export function deleteProductUnit(
  token: string,
  productUnitId: number
): Promise<DeleteProductUnitResponse> {
  return apiRequest<DeleteProductUnitResponse>(
    `/product-units/${productUnitId}`,
    {
      method: "DELETE",
      token,
    }
  );
}
