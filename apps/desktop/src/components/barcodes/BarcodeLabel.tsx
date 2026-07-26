import Code128Barcode
    from './Code128Barcode';

import type {
    BarcodeLabelSettings,
    BarcodeProduct,
} from '../../types/barcode';

interface BarcodeLabelProps {
    businessName: string;
    currencyCode: string;
    product: BarcodeProduct;
    settings: BarcodeLabelSettings;
}

function formatCurrency(
    value: number,
    currencyCode: string,
): string {
    try {
        return new Intl.NumberFormat(
            'en-GB',
            {
                style: 'currency',
                currency:
                    currencyCode,
                minimumFractionDigits: 2,
            },
        ).format(value);
    } catch {
        return new Intl.NumberFormat(
            'en-GB',
            {
                style: 'currency',
                currency: 'LKR',
                minimumFractionDigits: 2,
            },
        ).format(value);
    }
}

export default function BarcodeLabel({
    businessName,
    currencyCode,
    product,
    settings,
}: BarcodeLabelProps) {
    if (!product.barcode) {
        return null;
    }

    return (
        <article
            className="product-barcode-label"
            style={{
                width:
                    `${settings.width_mm}mm`,

                height:
                    `${settings.height_mm}mm`,
            }}
        >
            {settings
                .show_business_name && (
                    <div className="barcode-label-business">
                        {businessName}
                    </div>
                )}

            {settings
                .show_product_name && (
                    <strong className="barcode-label-product">
                        {product.name}
                    </strong>
                )}

            <Code128Barcode
                value={product.barcode}
                height={42}
                showText
                className="barcode-label-svg"
            />

            <div className="barcode-label-footer">
                {settings.show_sku && (
                    <span>
                        {product.sku
                            ?? 'No SKU'}
                    </span>
                )}

                {settings.show_price
                    && product
                        .current_selling_price
                    !== null && (
                        <strong>
                            {formatCurrency(
                                product
                                    .current_selling_price,
                                currencyCode,
                            )}
                        </strong>
                    )}
            </div>
        </article>
    );
}