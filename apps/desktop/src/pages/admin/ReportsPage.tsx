import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {
    createPortal,
} from 'react-dom';

import {
    useAuth,
} from '../../auth/AuthContext';

import {
    ApiError,
} from '../../lib/api';

import {
    getReportOverview,
} from '../../services/reportService';

import type {
    ReportOverviewData,
} from '../../types/report';

type ReportTab =
    | 'overview'
    | 'products'
    | 'expenses'
    | 'dues'
    | 'inventory';

const currencyFormatter =
    new Intl.NumberFormat(
        'en-GB',
        {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        },
    );

const quantityFormatter =
    new Intl.NumberFormat(
        'en-GB',
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        },
    );

const BUSINESS_TIME_ZONE =
    'Asia/Colombo';

function businessDateKey(
    date: Date = new Date(),
): string {
    const parts =
        new Intl.DateTimeFormat(
            'en-GB',
            {
                timeZone:
                    BUSINESS_TIME_ZONE,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            },
        ).formatToParts(
            date,
        );

    const year =
        parts.find(
            (part) =>
                part.type === 'year',
        )?.value;

    const month =
        parts.find(
            (part) =>
                part.type === 'month',
        )?.value;

    const day =
        parts.find(
            (part) =>
                part.type === 'day',
        )?.value;

    if (
        !year
        || !month
        || !day
    ) {
        throw new Error(
            'Unable to determine the Sri Lanka business date.',
        );
    }

    return `${year}-${month}-${day}`;
}

function currentDate(): string {
    return businessDateKey();
}

function monthStart(): string {
    const today =
        businessDateKey();

    return `${today.slice(0, 7)}-01`;
}

function formatDate(
    value: string | null,
): string {
    if (!value) {
        return 'Not set';
    }

    const dateOnly =
        value.match(
            /^(\d{4}-\d{2}-\d{2})/,
        )?.[1]
        ?? value;

    const date =
        new Date(
            `${dateOnly}T00:00:00+05:30`,
        );

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return value;
    }

    return new Intl.DateTimeFormat(
        'en-GB',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            timeZone:
                BUSINESS_TIME_ZONE,
        },
    ).format(
        date,
    );
}

function paymentMethodName(
    value: string | null,
): string {
    switch (value) {
        case 'bank_transfer':
            return 'Bank Transfer';

        case 'card':
            return 'Card';

        case 'cash':
            return 'Cash';

        case 'mixed':
            return 'Mixed Payment';

        case 'cheque':
            return 'Cheque';

        default:
            return 'On Due';
    }
}

function escapeCsv(
    value:
        string
        | number
        | null,
): string {
    const text =
        value === null
            ? ''
            : String(value);

    return `"${text.replace(
        /"/g,
        '""',
    )}"`;
}

type CsvCell = string | number | null;

interface InventoryQuantityByUnit {
    unit: string;
    quantity: number;
}

type InventoryProductRow =
    ReportOverviewData['inventory']['products'][number]
    & {
        stock_unit?: string;
        quantity_by_unit?: InventoryQuantityByUnit[];
        quantity_display?: string;
    };

type InventorySummaryRow =
    ReportOverviewData['inventory']['summary']
    & {
        quantity_by_unit?: InventoryQuantityByUnit[];
        quantity_display?: string;
    };

interface FullInventoryHistoryRow {
    row_key: string;

    product_id: number;

    product_name: string;

    product_variant_id: number | null;

    variant_name: string;

    category: {
        id: number;
        name: string;
    };

    price_unit: string;

    stock_unit: string;

    secondary_unit: string | null;

    conversion_factor: number;

    purchase_cost: number | null;

    selling_price: number | null;

    secondary_selling_price: number | null;

    total_received_quantity: number;

    remaining_quantity: number;

    batch_count: number;
}

type InventoryWithFullHistory =
    ReportOverviewData['inventory']
    & {
        full_history?: FullInventoryHistoryRow[];
    };

function allTimeInventoryRows(
    report:
        ReportOverviewData
        | null,
): FullInventoryHistoryRow[] {
    if (!report) {
        return [];
    }

    const inventory =
        report
            .inventory as InventoryWithFullHistory;

    return Array.isArray(
        inventory.full_history,
    )
        ? inventory
            .full_history
            .filter(
                (
                    row,
                ) =>
                    Number(
                        row
                            .remaining_quantity
                        ?? 0,
                    ) > 0.0001,
            )
        : [];
}

function optionalCurrency(
    value:
        number
        | null,
): string {
    if (
        value === null
        || !Number.isFinite(
            Number(
                value,
            ),
        )
    ) {
        return 'Not set';
    }

    return currencyFormatter.format(
        Number(
            value,
        ),
    );
}

function triggerDownload(
    blob: Blob,
    fileName: string,
): void {
    const url =
        URL.createObjectURL(
            blob,
        );

    const anchor =
        document.createElement(
            'a',
        );

    anchor.href =
        url;

    anchor.download =
        fileName;

    anchor.style.display =
        'none';

    document.body.appendChild(
        anchor,
    );

    anchor.click();

    anchor.remove();

    window.setTimeout(
        () => {
            URL.revokeObjectURL(
                url,
            );
        },
        1_000,
    );
}

function xmlEscape(
    value:
        string
        | number
        | null,
): string {
    if (
        value === null
        || value === undefined
    ) {
        return '';
    }

    return String(
        value,
    )
        .replace(
            /&/g,
            '&amp;',
        )
        .replace(
            /</g,
            '&lt;',
        )
        .replace(
            />/g,
            '&gt;',
        )
        .replace(
            /"/g,
            '&quot;',
        )
        .replace(
            /'/g,
            '&apos;',
        );
}

function downloadFullInventoryExcel(
    rows:
        FullInventoryHistoryRow[],
): void {
    const createdDate =
        businessDateKey();

    const excelRows =
        rows.map(
            (
                row,
            ) => [
                    row.product_name,
                    row.variant_name,
                    row.category.name,

                    row.purchase_cost,

                    row.selling_price,

                    row.secondary_selling_price,

                    row.price_unit,

                    row.secondary_unit
                    ?? '',

                    row.total_received_quantity,

                    row.stock_unit,

                    row.remaining_quantity,

                    row.stock_unit,

                    row.batch_count,
                ],
        );

    const headers = [
        'Product',
        'Variant',
        'Category',
        'Cost Per 1 Unit',
        'Sale Price Per 1 Unit',
        'Loose Sale Price',
        'Price Unit',
        'Loose Unit',
        'All-Time Purchased',
        'Purchased Stock Unit',
        'Current Remaining',
        'Remaining Stock Unit',
        'Purchase Lots',
    ];

    const columnWidths = [
        180,
        90,
        110,
        110,
        120,
        110,
        90,
        80,
        120,
        110,
        120,
        110,
        85,
    ];

    const numberIndexes =
        new Set(
            [
                3,
                4,
                5,
                8,
                10,
                12,
            ],
        );

    const dataRowsXml =
        excelRows
            .map(
                (
                    row,
                ) => `
                    <Row>
                        ${row
                        .map(
                            (
                                value,
                                index,
                            ) => {
                                if (
                                    numberIndexes.has(
                                        index,
                                    )
                                    && value !== null
                                    && value !== ''
                                    && Number.isFinite(
                                        Number(
                                            value,
                                        ),
                                    )
                                ) {
                                    return `
                                            <Cell ss:StyleID="NumberCell">
                                                <Data ss:Type="Number">${Number(
                                        value,
                                    )}</Data>
                                            </Cell>
                                        `;
                                }

                                return `
                                        <Cell>
                                            <Data ss:Type="String">${xmlEscape(
                                    value,
                                )}</Data>
                                        </Cell>
                                    `;
                            },
                        )
                        .join('')}
                    </Row>
                `,
            )
            .join('');

    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
    xmlns="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:html="http://www.w3.org/TR/REC-html40"
>
    <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
        <Author>Samarakoon Agro POS</Author>
        <Title>All-Time Full Inventory</Title>
        <Created>${new Date().toISOString()}</Created>
    </DocumentProperties>

    <Styles>
        <Style ss:ID="Default" ss:Name="Normal">
            <Alignment
                ss:Vertical="Center"
            />
            <Font
                ss:FontName="Calibri"
                ss:Size="11"
            />
        </Style>

        <Style ss:ID="Title">
            <Font
                ss:FontName="Calibri"
                ss:Size="16"
                ss:Bold="1"
            />
        </Style>

        <Style ss:ID="Subtitle">
            <Font
                ss:FontName="Calibri"
                ss:Size="10"
                ss:Color="#667085"
            />
        </Style>

        <Style ss:ID="Header">
            <Alignment
                ss:Horizontal="Center"
                ss:Vertical="Center"
                ss:WrapText="1"
            />
            <Font
                ss:FontName="Calibri"
                ss:Size="10"
                ss:Bold="1"
                ss:Color="#FFFFFF"
            />
            <Interior
                ss:Color="#15803D"
                ss:Pattern="Solid"
            />
            <Borders>
                <Border
                    ss:Position="Bottom"
                    ss:LineStyle="Continuous"
                    ss:Weight="1"
                    ss:Color="#D0D5DD"
                />
            </Borders>
        </Style>

        <Style ss:ID="NumberCell">
            <NumberFormat
                ss:Format="0.00"
            />
        </Style>

        <Style ss:ID="CurrencyCell">
            <NumberFormat
                ss:Format="&quot;LKR&quot; #,##0.00"
            />
        </Style>
    </Styles>

    <Worksheet ss:Name="Full Inventory">
        <Table
            ss:ExpandedColumnCount="${headers.length}"
            ss:ExpandedRowCount="${excelRows.length + 4}"
            x:FullColumns="1"
            x:FullRows="1"
        >
            ${columnWidths
            .map(
                (
                    width,
                ) =>
                    `<Column ss:AutoFitWidth="0" ss:Width="${width}" />`,
            )
            .join('')}

            <Row ss:Height="24">
                <Cell
                    ss:StyleID="Title"
                    ss:MergeAcross="${headers.length - 1}"
                >
                    <Data ss:Type="String">
                        Samarakoon Agro POS - All-Time Full Inventory
                    </Data>
                </Cell>
            </Row>

            <Row>
                <Cell
                    ss:StyleID="Subtitle"
                    ss:MergeAcross="${headers.length - 1}"
                >
                    <Data ss:Type="String">
                        Generated ${xmlEscape(
                createdDate,
            )} - ${rows.length} variant / price rows
                    </Data>
                </Cell>
            </Row>

            <Row />

            <Row ss:Height="28">
                ${headers
            .map(
                (
                    header,
                ) => `
                            <Cell ss:StyleID="Header">
                                <Data ss:Type="String">${xmlEscape(
                    header,
                )}</Data>
                            </Cell>
                        `,
            )
            .join('')}
            </Row>

            ${dataRowsXml}
        </Table>

        <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
            <FreezePanes />
            <FrozenNoSplit />
            <SplitHorizontal>4</SplitHorizontal>
            <TopRowBottomPane>4</TopRowBottomPane>
            <ActivePane>2</ActivePane>
            <ProtectObjects>False</ProtectObjects>
            <ProtectScenarios>False</ProtectScenarios>
        </WorksheetOptions>

        <AutoFilter
            x:Range="R4C1:R${excelRows.length + 4}C${headers.length}"
            xmlns="urn:schemas-microsoft-com:office:excel"
        />
    </Worksheet>
</Workbook>`;

    triggerDownload(
        new Blob(
            [
                '\uFEFF',
                xml,
            ],
            {
                type:
                    'application/vnd.ms-excel;charset=utf-8',
            },
        ),
        `samarakoon-all-time-inventory-${createdDate}.xls`,
    );
}

function pdfSafeText(
    value:
        string
        | number
        | null,
): string {
    return String(
        value
        ?? '',
    )
        .normalize(
            'NFKD',
        )
        .replace(
            /[^\x20-\x7E]/g,
            '?',
        )
        .replace(
            /\\/g,
            '\\\\',
        )
        .replace(
            /\(/g,
            '\\(',
        )
        .replace(
            /\)/g,
            '\\)',
        );
}

function truncatePdfText(
    value:
        string,
    maximumLength:
        number,
): string {
    if (
        value.length
        <= maximumLength
    ) {
        return value;
    }

    return `${value.slice(
        0,
        Math.max(
            1,
            maximumLength - 3,
        ),
    )}...`;
}

interface PdfInventoryColumn {
    key:
    | 'product'
    | 'variant'
    | 'category'
    | 'cost'
    | 'sale'
    | 'loose'
    | 'purchased'
    | 'remaining'
    | 'lots';

    title: string;

    width: number;

    maxChars: number;
}

function downloadFullInventoryPdf(
    rows:
        FullInventoryHistoryRow[],
): void {
    /*
     * Dependency-free PDF export.
     *
     * This intentionally uses the standard PDF Helvetica fonts so the
     * feature works without adding jspdf/html2canvas dependencies to the
     * Electron renderer.
     */
    const pageWidth =
        842;

    const pageHeight =
        595;

    const marginX =
        24;

    const columns:
        PdfInventoryColumn[] = [
            /*
             * Keep the SAME PDF font sizes.
             *
             * The previous PDF used narrow Cost/Sale columns with
             * maxChars=15, so values such as:
             *
             * LKR 500.00 / Packet
             *
             * were shortened to:
             *
             * LKR 500.00 /...
             *
             * The widths below are redistributed across the same A4
             * landscape page so the complete price unit remains visible.
             */
            {
                key:
                    'product',
                title:
                    'Product',
                width:
                    108,
                maxChars:
                    22,
            },
            {
                key:
                    'variant',
                title:
                    'Variant',
                width:
                    52,
                maxChars:
                    10,
            },
            {
                key:
                    'category',
                title:
                    'Category',
                width:
                    65,
                maxChars:
                    12,
            },
            {
                key:
                    'cost',
                title:
                    'Cost / Unit',
                width:
                    108,
                maxChars:
                    28,
            },
            {
                key:
                    'sale',
                title:
                    'Sale / Unit',
                width:
                    108,
                maxChars:
                    28,
            },
            {
                key:
                    'loose',
                title:
                    'Loose Price',
                width:
                    96,
                maxChars:
                    24,
            },
            {
                key:
                    'purchased',
                title:
                    'All-Time Purchased',
                width:
                    100,
                maxChars:
                    20,
            },
            {
                key:
                    'remaining',
                title:
                    'Current Remaining',
                width:
                    105,
                maxChars:
                    20,
            },
            {
                key:
                    'lots',
                title:
                    'Lots',
                width:
                    42,
                maxChars:
                    7,
            },
        ];

    const rowHeight =
        18;

    const startY =
        496;

    const bottomY =
        42;

    const rowsPerPage =
        Math.max(
            1,
            Math.floor(
                (
                    startY
                    - bottomY
                )
                / rowHeight,
            ),
        );

    const pageCount =
        Math.max(
            1,
            Math.ceil(
                rows.length
                / rowsPerPage,
            ),
        );

    const textCommand = (
        x:
            number,
        y:
            number,
        size:
            number,
        value:
            string,
        bold = false,
    ): string =>
        `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(
            2,
        )} ${y.toFixed(
            2,
        )} Td (${pdfSafeText(
            value,
        )}) Tj ET\n`;

    const lineCommand = (
        x1:
            number,
        y1:
            number,
        x2:
            number,
        y2:
            number,
    ): string =>
        `0.75 w 0.86 0.88 0.91 RG ${x1.toFixed(
            2,
        )} ${y1.toFixed(
            2,
        )} m ${x2.toFixed(
            2,
        )} ${y2.toFixed(
            2,
        )} l S\n`;

    const cellValue = (
        row:
            FullInventoryHistoryRow,
        key:
            PdfInventoryColumn['key'],
    ): string => {
        switch (key) {
            case 'product':
                return row
                    .product_name;

            case 'variant':
                return row
                    .variant_name;

            case 'category':
                return row
                    .category
                    .name;

            case 'cost':
                return row
                    .purchase_cost
                    === null
                    ? 'Not set'
                    : `LKR ${Number(
                        row
                            .purchase_cost,
                    ).toFixed(
                        2,
                    )} / ${row.price_unit}`;

            case 'sale':
                return row
                    .selling_price
                    === null
                    ? 'Not set'
                    : `LKR ${Number(
                        row
                            .selling_price,
                    ).toFixed(
                        2,
                    )} / ${row.price_unit}`;

            case 'loose':
                return (
                    row
                        .secondary_unit
                    && row
                        .secondary_selling_price
                    !== null
                )
                    ? `LKR ${Number(
                        row
                            .secondary_selling_price,
                    ).toFixed(
                        2,
                    )} / ${row.secondary_unit}`
                    : '-';

            case 'purchased':
                return `${formatQuantity(
                    row
                        .total_received_quantity,
                )} ${row.stock_unit}`;

            case 'remaining':
                return `${formatQuantity(
                    row
                        .remaining_quantity,
                )} ${row.stock_unit}`;

            case 'lots':
                return String(
                    row
                        .batch_count,
                );

            default:
                return '';
        }
    };

    const pageStreams:
        string[] = [];

    for (
        let pageIndex = 0;
        pageIndex < pageCount;
        pageIndex += 1
    ) {
        const pageRows =
            rows.slice(
                pageIndex
                * rowsPerPage,
                (
                    pageIndex
                    + 1
                )
                * rowsPerPage,
            );

        let stream =
            '';

        stream += textCommand(
            marginX,
            562,
            16,
            'Samarakoon Agro POS - All-Time Full Inventory',
            true,
        );

        stream += textCommand(
            marginX,
            546,
            8.5,
            `Generated: ${businessDateKey()} | Rows: ${rows.length} | Page ${pageIndex + 1} of ${pageCount}`,
        );

        stream += textCommand(
            marginX,
            532,
            7.5,
            'Rows are separated by exact product variant and historical price combination.',
        );

        stream += lineCommand(
            marginX,
            520,
            pageWidth
            - marginX,
            520,
        );

        let x =
            marginX;

        columns.forEach(
            (
                column,
            ) => {
                stream += textCommand(
                    x + 3,
                    505,
                    7.2,
                    truncatePdfText(
                        column.title,
                        column.maxChars,
                    ),
                    true,
                );

                x +=
                    column.width;
            },
        );

        stream += lineCommand(
            marginX,
            499,
            pageWidth
            - marginX,
            499,
        );

        let y =
            startY - 14;

        pageRows.forEach(
            (
                row,
            ) => {
                let cellX =
                    marginX;

                columns.forEach(
                    (
                        column,
                    ) => {
                        const value =
                            cellValue(
                                row,
                                column.key,
                            );

                        stream += textCommand(
                            cellX + 3,
                            y,
                            6.8,
                            truncatePdfText(
                                value,
                                column.maxChars,
                            ),
                        );

                        cellX +=
                            column.width;
                    },
                );

                stream += lineCommand(
                    marginX,
                    y - 5,
                    pageWidth
                    - marginX,
                    y - 5,
                );

                y -=
                    rowHeight;
            },
        );

        pageStreams.push(
            stream,
        );
    }

    const objects:
        string[] = [
            '',
        ];

    objects[1] =
        '<< /Type /Catalog /Pages 2 0 R >>';

    const pageObjectNumbers =
        pageStreams.map(
            (
                _stream,
                index,
            ) =>
                5
                + (
                    index
                    * 2
                ),
        );

    objects[2] =
        `<< /Type /Pages /Count ${pageStreams.length} /Kids [${pageObjectNumbers
            .map(
                (
                    objectNumber,
                ) =>
                    `${objectNumber} 0 R`,
            )
            .join(
                ' ',
            )}] >>`;

    objects[3] =
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

    objects[4] =
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';

    pageStreams.forEach(
        (
            stream,
            index,
        ) => {
            const pageObject =
                5
                + (
                    index
                    * 2
                );

            const contentObject =
                pageObject
                + 1;

            objects[
                pageObject
            ] =
                `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObject} 0 R >>`;

            objects[
                contentObject
            ] =
                `<< /Length ${stream.length} >>\nstream\n${stream}endstream`;
        },
    );

    const encoder =
        new TextEncoder();

    let pdf =
        '%PDF-1.4\n';

    const offsets:
        number[] = [
            0,
        ];

    for (
        let index = 1;
        index < objects.length;
        index += 1
    ) {
        offsets[
            index
        ] =
            encoder.encode(
                pdf,
            ).length;

        pdf +=
            `${index} 0 obj\n${objects[index]}\nendobj\n`;
    }

    const xrefOffset =
        encoder.encode(
            pdf,
        ).length;

    pdf +=
        `xref\n0 ${objects.length}\n`;

    pdf +=
        '0000000000 65535 f \n';

    for (
        let index = 1;
        index < objects.length;
        index += 1
    ) {
        pdf +=
            `${String(
                offsets[
                index
                ],
            ).padStart(
                10,
                '0',
            )} 00000 n \n`;
    }

    pdf +=
        `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    triggerDownload(
        new Blob(
            [
                pdf,
            ],
            {
                type:
                    'application/pdf',
            },
        ),
        `samarakoon-all-time-inventory-${businessDateKey()}.pdf`,
    );
}

function formatQuantity(
    value: number,
): string {
    const number =
        Number(
            value,
        );

    return quantityFormatter.format(
        Number.isFinite(
            number,
        )
            ? number
            : 0,
    );
}

function formatQuantityByUnit(
    items:
        InventoryQuantityByUnit[]
        | undefined,
): string {
    if (
        !Array.isArray(
            items,
        )
        || items.length === 0
    ) {
        return '';
    }

    return items
        .filter(
            (item) =>
                item
                && typeof item.unit === 'string'
                && item.unit.trim() !== '',
        )
        .map(
            (item) =>
                `${formatQuantity(
                    Number(
                        item.quantity,
                    ),
                )} ${item.unit.trim()}`,
        )
        .join(' • ');
}

function inventorySummaryQuantityText(
    summary:
        ReportOverviewData['inventory']['summary'],
): string {
    const extended =
        summary as InventorySummaryRow;

    if (
        typeof extended.quantity_display === 'string'
        && extended.quantity_display.trim() !== ''
    ) {
        return extended.quantity_display.trim();
    }

    const grouped =
        formatQuantityByUnit(
            extended.quantity_by_unit,
        );

    if (
        grouped !== ''
    ) {
        return grouped;
    }

    return formatQuantity(
        Number(
            summary.quantity
            ?? 0,
        ),
    );
}

function inventoryProductQuantityText(
    product:
        ReportOverviewData['inventory']['products'][number],
): string {
    const extended =
        product as InventoryProductRow;

    if (
        typeof extended.quantity_display === 'string'
        && extended.quantity_display.trim() !== ''
    ) {
        return extended.quantity_display.trim();
    }

    const grouped =
        formatQuantityByUnit(
            extended.quantity_by_unit,
        );

    if (
        grouped !== ''
    ) {
        return grouped;
    }

    const stockUnit =
        typeof extended.stock_unit === 'string'
            && extended.stock_unit.trim() !== ''
            ? extended.stock_unit.trim()
            : (
                typeof product.unit === 'string'
                    && product.unit.trim() !== ''
                    ? product.unit.trim()
                    : 'Unit'
            );

    return `${formatQuantity(
        Number(
            product.quantity
            ?? 0,
        ),
    )} ${stockUnit}`;
}

function downloadCsv(
    report: ReportOverviewData,
): void {
    const rows: CsvCell[][] = [];

    rows.push(['Samarakoon Agro POS Report']);
    rows.push(['Date From', report.period.date_from]);
    rows.push(['Date To', report.period.date_to]);
    rows.push([]);
    rows.push(['Financial Summary']);
    rows.push(['Sales Count', report.summary.sales_count]);
    rows.push(['Sales Total', report.summary.sales_total]);
    rows.push(['Collected Amount', report.summary.collected_amount]);
    rows.push(['Due Amount', report.summary.due_amount]);
    rows.push(['Discount Total', report.summary.discount_total]);
    rows.push(['Gross Profit', report.summary.gross_profit]);
    rows.push(['Return Refund', report.summary.return_refund]);
    rows.push(['Expense Total', report.summary.expense_total]);
    rows.push(['Final Net Profit', report.summary.final_net_profit]);
    rows.push([]);
    rows.push(['Daily Activity']);
    rows.push(['Date', 'Sales', 'Collections', 'Expenses', 'Returns']);

    report.daily_series.forEach(
        (item) => {
            rows.push([
                item.date,
                item.sales,
                item.collections,
                item.expenses,
                item.returns,
            ]);
        },
    );

    rows.push([]);
    rows.push(['Product Performance']);
    rows.push(['Product', 'Category', 'Quantity Sold', 'Unit', 'Sales Total', 'Cost Total', 'Gross Profit']);

    report.product_performance.forEach(
        (product) => {
            rows.push([
                product.name,
                product.category.name,
                product.quantity_sold,
                product.unit,
                product.sales_total,
                product.cost_total,
                product.gross_profit,
            ]);
        },
    );

    rows.push([]);
    rows.push(['Expense Categories']);
    rows.push(['Category', 'Expense Count', 'Total Amount']);

    report.expense_categories.forEach(
        (category) => {
            rows.push([
                category.name,
                category.expense_count,
                category.total_amount,
            ]);
        },
    );

    rows.push([]);
    rows.push(['Customer Dues']);
    rows.push(['Customer', 'Customer Code', 'Mobile', 'Due Sales', 'Sales Total', 'Paid Amount', 'Due Amount']);

    report.customer_dues.forEach(
        (customer) => {
            rows.push([
                customer.name,
                customer.customer_code,
                customer.mobile,
                customer.due_sales,
                customer.sales_total,
                customer.paid_amount,
                customer.due_amount,
            ]);
        },
    );

    rows.push([]);
    rows.push(['Inventory']);
    rows.push([
        'Product',
        'Category',
        'Stock Quantity',
        'Batch Count',
        'Purchase Value',
        'Retail Value',
        'Nearest Expiry',
    ]);

    report.inventory.products.forEach(
        (product) => {
            rows.push([
                product.name,
                product.category.name,
                inventoryProductQuantityText(
                    product,
                ),
                product.batch_count,
                product.purchase_value,
                product.retail_value,
                product.nearest_expiry,
            ]);
        },
    );

    const csv =
        rows
            .map(
                (row) =>
                    row
                        .map(escapeCsv)
                        .join(','),
            )
            .join('\n');

    const blob =
        new Blob(
            [csv],
            { type: 'text/csv;charset=utf-8' },
        );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `samarakoon-report-${report.period.date_from}-to-${report.period.date_to}.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Scoped, isolated stylesheet — same hardened pattern as ExpensesPage.
// Every rule is ID-scoped (#sapo-reports-page) and !important so that no
// global admin/layout CSS (sidebar ".active", generic ".content-card", etc.)
// can leak in and override tab colors, text contrast, or scroll behaviour.
// ---------------------------------------------------------------------------
const reportsPageStyles = `
    #sapo-reports-page,
    #sapo-reports-page *,
    #sapo-reports-page *::before,
    #sapo-reports-page *::after {
        box-sizing: border-box !important;
    }

    #sapo-reports-page {
        --rp-blue: #2563eb;
        --rp-blue-dark: #1d4ed8;
        --rp-blue-light: #eff6ff;
        --rp-green: #15803d;
        --rp-green-light: #f0fdf4;
        --rp-red: #dc2626;
        --rp-red-light: #fef2f2;
        --rp-amber: #b45309;
        --rp-amber-light: #fffbeb;
        --rp-text: #111827;
        --rp-text-secondary: #1f2937;
        --rp-muted: #6b7280;
        --rp-subtle: #9ca3af;
        --rp-border: #e5e7eb;
        --rp-border-strong: #d1d5db;
        --rp-bg: #f9fafb;
        --rp-white: #ffffff;
        --rp-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        gap: 20px !important;
        margin: 0 !important;
        padding: 0 !important;
        color: var(--rp-text-secondary) !important;
        font-family: var(--rp-font) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        background: transparent !important;
        isolation: isolate !important;
    }

    #sapo-reports-page h2,
    #sapo-reports-page h3,
    #sapo-reports-page p,
    #sapo-reports-page span,
    #sapo-reports-page strong,
    #sapo-reports-page small,
    #sapo-reports-page label,
    #sapo-reports-page button,
    #sapo-reports-page input,
    #sapo-reports-page select,
    #sapo-reports-page table,
    #sapo-reports-page th,
    #sapo-reports-page td {
        font-family: var(--rp-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-reports-page h2,
    #sapo-reports-page h3,
    #sapo-reports-page p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* ---------- Header ---------- */
    #sapo-reports-page .rp-header {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 16px !important;
        padding: 20px 24px !important;
        background: var(--rp-white) !important;
        border: 1px solid var(--rp-border) !important;
        border-radius: 10px !important;
    }

    #sapo-reports-page .rp-kicker {
        display: inline-block !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        color: var(--rp-blue) !important;
        background: transparent !important;
        margin-bottom: 6px !important;
    }

    #sapo-reports-page .rp-header h2 {
        font-size: 22px !important;
        font-weight: 700 !important;
        color: var(--rp-text) !important;
        margin-bottom: 4px !important;
    }

    #sapo-reports-page .rp-header p {
        font-size: 13.5px !important;
        color: var(--rp-muted) !important;
        max-width: 480px !important;
    }

    #sapo-reports-page .rp-header-actions {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 10px !important;
        flex-shrink: 0 !important;
    }

    /* ---------- Buttons ---------- */
    #sapo-reports-page .rp-primary-button,
    #sapo-reports-page .rp-secondary-button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 38px !important;
        padding: 0 16px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease !important;
    }

    #sapo-reports-page .rp-primary-button {
        color: #ffffff !important;
        background: var(--rp-blue) !important;
        border: 1px solid var(--rp-blue) !important;
    }

    #sapo-reports-page .rp-primary-button:hover:not(:disabled) {
        background: var(--rp-blue-dark) !important;
        border-color: var(--rp-blue-dark) !important;
    }

    #sapo-reports-page .rp-secondary-button {
        color: #374151 !important;
        background: var(--rp-white) !important;
        border: 1px solid var(--rp-border-strong) !important;
    }

    #sapo-reports-page .rp-secondary-button:hover:not(:disabled) {
        background: var(--rp-bg) !important;
        border-color: #9ca3af !important;
    }

    #sapo-reports-page button:disabled {
        opacity: 0.55 !important;
        cursor: not-allowed !important;
    }

    /* ---------- Filter card ---------- */
    #sapo-reports-page .rp-filter-card {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: flex-end !important;
        gap: 16px !important;
        padding: 20px !important;
        background: var(--rp-white) !important;
        border: 1px solid var(--rp-border) !important;
        border-radius: 10px !important;
    }

    #sapo-reports-page .rp-filter-card label {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        min-width: 150px !important;
    }

    #sapo-reports-page .rp-filter-card label span {
        font-size: 11.5px !important;
        font-weight: 600 !important;
        color: var(--rp-muted) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        background: transparent !important;
    }

    #sapo-reports-page .rp-filter-card input,
    #sapo-reports-page .rp-filter-card select {
        height: 38px !important;
        padding: 0 12px !important;
        font-size: 13.5px !important;
        font-weight: 400 !important;
        color: var(--rp-text-secondary) !important;
        border: 1px solid var(--rp-border-strong) !important;
        border-radius: 8px !important;
        background: var(--rp-bg) !important;
        outline: none !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease !important;
    }

    #sapo-reports-page .rp-filter-card input:focus,
    #sapo-reports-page .rp-filter-card select:focus {
        border-color: var(--rp-blue) !important;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
        background: var(--rp-white) !important;
    }

    #sapo-reports-page .rp-filter-card > button {
        height: 38px !important;
    }

    /* ---------- Alert ---------- */
    #sapo-reports-page .rp-form-alert {
        padding: 12px 16px !important;
        border-radius: 8px !important;
        font-size: 13.5px !important;
        font-weight: 500 !important;
        background: var(--rp-red-light) !important;
        border: 1px solid #fecaca !important;
        color: #b91c1c !important;
    }

    /* ---------- Tabs ---------- */
    #sapo-reports-page .rp-tabs {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 4px !important;
        padding: 8px !important;
        background: var(--rp-white) !important;
        border: 1px solid var(--rp-border) !important;
        border-radius: 10px !important;
        overflow-x: auto !important;
    }

    #sapo-reports-page .rp-tabs button {
        height: 36px !important;
        padding: 0 16px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: var(--rp-muted) !important;
        background: transparent !important;
        border: 1px solid transparent !important;
        border-radius: 7px !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease !important;
    }

    #sapo-reports-page .rp-tabs button:hover {
        color: var(--rp-text) !important;
        background: var(--rp-bg) !important;
    }

    #sapo-reports-page .rp-tabs button.rp-tab-active {
        color: var(--rp-blue) !important;
        background: var(--rp-blue-light) !important;
        border-color: #bfdbfe !important;
    }

    /* ---------- Loading state ---------- */
    #sapo-reports-page .rp-page-state {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 10px !important;
        padding: 48px 0 !important;
        color: var(--rp-muted) !important;
        font-size: 13.5px !important;
        background: var(--rp-white) !important;
        border: 1px solid var(--rp-border) !important;
        border-radius: 10px !important;
    }

    #sapo-reports-page .rp-spinner {
        width: 16px !important;
        height: 16px !important;
        border: 2px solid var(--rp-border) !important;
        border-top-color: var(--rp-blue) !important;
        border-radius: 50% !important;
        animation: rp-spin 0.7s linear infinite !important;
    }

    @keyframes rp-spin {
        to { transform: rotate(360deg); }
    }

    /* ---------- Summary grid ---------- */
    #sapo-reports-page .rp-summary-grid {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)) !important;
        gap: 16px !important;
    }

    #sapo-reports-page .rp-summary-grid article {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
        padding: 18px 20px !important;
        background: var(--rp-white) !important;
        border: 1px solid var(--rp-border) !important;
        border-radius: 10px !important;
    }

    #sapo-reports-page .rp-summary-grid span {
        font-size: 12px !important;
        font-weight: 500 !important;
        color: var(--rp-muted) !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        background: transparent !important;
    }

    #sapo-reports-page .rp-summary-grid strong {
        font-size: 21px !important;
        font-weight: 700 !important;
        color: var(--rp-text) !important;
        background: transparent !important;
    }

    #sapo-reports-page .rp-summary-grid small {
        font-size: 12px !important;
        color: var(--rp-subtle) !important;
        background: transparent !important;
    }

    /* ---------- Two column layout ---------- */
    #sapo-reports-page .rp-two-column {
        display: grid !important;
        grid-template-columns: 1.6fr 1fr !important;
        gap: 16px !important;
    }

    @media (max-width: 900px) {
        #sapo-reports-page .rp-two-column {
            grid-template-columns: 1fr !important;
        }
    }

    #sapo-reports-page .rp-card {
        background: var(--rp-white) !important;
        border: 1px solid var(--rp-border) !important;
        border-radius: 10px !important;
        padding: 20px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 14px !important;
    }

    #sapo-reports-page .rp-card-header {
        display: flex !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
    }

    #sapo-reports-page .rp-card-header h3 {
        font-size: 15.5px !important;
        font-weight: 700 !important;
        color: var(--rp-text) !important;
    }

    /* ---------- Legend ---------- */
    #sapo-reports-page .rp-legend {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 16px !important;
        font-size: 12.5px !important;
        color: var(--rp-muted) !important;
    }

    #sapo-reports-page .rp-legend span {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        background: transparent !important;
        color: var(--rp-muted) !important;
    }

    #sapo-reports-page .rp-legend i {
        width: 10px !important;
        height: 10px !important;
        border-radius: 2px !important;
        display: inline-block !important;
    }

    #sapo-reports-page .rp-legend-sales { background: #2563eb !important; }
    #sapo-reports-page .rp-legend-collections { background: #16a34a !important; }
    #sapo-reports-page .rp-legend-expenses { background: #f59e0b !important; }
    #sapo-reports-page .rp-legend-returns { background: #dc2626 !important; }

    /* ---------- Bar chart (scrollable) ---------- */
    #sapo-reports-page .rp-bar-chart {
        max-height: 360px !important;
        overflow-y: auto !important;
        padding-right: 4px !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--rp-border-strong) transparent !important;
    }

    #sapo-reports-page .rp-bar-chart::-webkit-scrollbar {
        width: 8px !important;
    }

    #sapo-reports-page .rp-bar-chart::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-reports-page .rp-bar-chart::-webkit-scrollbar-thumb {
        background: var(--rp-border-strong) !important;
        border-radius: 8px !important;
    }

    #sapo-reports-page .rp-chart-row {
        display: grid !important;
        grid-template-columns: 90px 1fr 100px !important;
        align-items: center !important;
        gap: 12px !important;
        padding: 7px 0 !important;
        border-bottom: 1px solid #f1f5f9 !important;
        font-size: 12.5px !important;
    }

    #sapo-reports-page .rp-chart-row:last-child {
        border-bottom: none !important;
    }

    #sapo-reports-page .rp-chart-row > span {
        color: var(--rp-muted) !important;
        white-space: nowrap !important;
        background: transparent !important;
    }

    #sapo-reports-page .rp-chart-row > div {
        display: flex !important;
        flex-direction: column !important;
        gap: 2px !important;
    }

    #sapo-reports-page .rp-chart-row strong {
        font-size: 13px !important;
        font-weight: 600 !important;
        text-align: right !important;
        color: var(--rp-text) !important;
        background: transparent !important;
    }

    #sapo-reports-page .rp-bar {
        height: 4px !important;
        border-radius: 2px !important;
        min-width: 2px !important;
        background: var(--rp-border) !important;
    }

    #sapo-reports-page .rp-sales-bar { background: #2563eb !important; }
    #sapo-reports-page .rp-collections-bar { background: #16a34a !important; }
    #sapo-reports-page .rp-expenses-bar { background: #f59e0b !important; }
    #sapo-reports-page .rp-returns-bar { background: #dc2626 !important; }

    /* ---------- Payment list (scrollable) ---------- */
    #sapo-reports-page .rp-payment-list {
        display: flex !important;
        flex-direction: column !important;
        gap: 10px !important;
        max-height: 360px !important;
        overflow-y: auto !important;
        padding-right: 4px !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--rp-border-strong) transparent !important;
    }

    #sapo-reports-page .rp-payment-list::-webkit-scrollbar {
        width: 8px !important;
    }

    #sapo-reports-page .rp-payment-list::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-reports-page .rp-payment-list::-webkit-scrollbar-thumb {
        background: var(--rp-border-strong) !important;
        border-radius: 8px !important;
    }

    #sapo-reports-page .rp-payment-list article {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 12px 14px !important;
        border: 1px solid var(--rp-border) !important;
        border-radius: 8px !important;
        background: var(--rp-bg) !important;
    }

    #sapo-reports-page .rp-payment-list article > div {
        display: flex !important;
        flex-direction: column !important;
        gap: 2px !important;
    }

    #sapo-reports-page .rp-payment-list strong {
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: var(--rp-text) !important;
        background: transparent !important;
    }

    #sapo-reports-page .rp-payment-list article > div span {
        font-size: 12px !important;
        color: var(--rp-subtle) !important;
        background: transparent !important;
    }

    #sapo-reports-page .rp-payment-list > article > strong {
        font-size: 14px !important;
        color: var(--rp-text) !important;
    }

    /* ---------- Value colors ---------- */
    #sapo-reports-page .rp-positive-value { color: var(--rp-green) !important; }
    #sapo-reports-page .rp-negative-value { color: var(--rp-red) !important; }
    #sapo-reports-page .rp-warning-value { color: var(--rp-amber) !important; }

    #sapo-reports-page .rp-inventory-quantity {
        white-space: normal !important;
        overflow-wrap: anywhere !important;
        line-height: 1.35 !important;
    }

    #sapo-reports-page .rp-current-stock-note {
        display: block !important;
        margin-top: 3px !important;
        color: var(--rp-subtle) !important;
        font-size: 12px !important;
        line-height: 1.4 !important;
        background: transparent !important;
    }

    /* ---------- Scrollable tables ---------- */
    #sapo-reports-page .rp-table-container {
        max-height: 520px !important;
        overflow-y: auto !important;
        overflow-x: auto !important;
        border: 1px solid var(--rp-border) !important;
        border-radius: 8px !important;
        background: var(--rp-white) !important;
        scrollbar-width: thin !important;
        scrollbar-color: var(--rp-border-strong) transparent !important;
    }

    #sapo-reports-page .rp-table-container::-webkit-scrollbar {
        width: 8px !important;
        height: 8px !important;
    }

    #sapo-reports-page .rp-table-container::-webkit-scrollbar-track {
        background: transparent !important;
    }

    #sapo-reports-page .rp-table-container::-webkit-scrollbar-thumb {
        background: var(--rp-border-strong) !important;
        border-radius: 8px !important;
    }

    #sapo-reports-page .rp-table-container::-webkit-scrollbar-thumb:hover {
        background: #9ca3af !important;
    }

    #sapo-reports-page .rp-table {
        width: 100% !important;
        min-width: 720px !important;
        border-collapse: collapse !important;
        font-size: 13.5px !important;
        background: var(--rp-white) !important;
    }

    #sapo-reports-page .rp-table thead {
        position: sticky !important;
        top: 0 !important;
        z-index: 1 !important;
    }

    #sapo-reports-page .rp-table thead th {
        background: #f9fafb !important;
        color: var(--rp-muted) !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        text-align: left !important;
        padding: 12px 16px !important;
        border-bottom: 1px solid var(--rp-border) !important;
        white-space: nowrap !important;
    }

    #sapo-reports-page .rp-table tbody td {
        padding: 12px 16px !important;
        border-bottom: 1px solid #f1f5f9 !important;
        vertical-align: middle !important;
        color: var(--rp-text-secondary) !important;
        background: var(--rp-white) !important;
        white-space: nowrap !important;
    }

    #sapo-reports-page .rp-table tbody tr:last-child td {
        border-bottom: none !important;
    }

    #sapo-reports-page .rp-table tbody tr:hover td {
        background: #f9fafb !important;
    }

    #sapo-reports-page .rp-table td strong {
        font-weight: 600 !important;
        color: var(--rp-text) !important;
        background: transparent !important;
    }

    #sapo-reports-page .rp-table td small {
        display: block !important;
        margin-top: 2px !important;
        font-size: 12px !important;
        color: var(--rp-subtle) !important;
        background: transparent !important;
    }

    #sapo-reports-page .rp-table-state {
        text-align: center !important;
        padding: 40px 16px !important;
        color: var(--rp-subtle) !important;
        font-size: 13px !important;
        white-space: normal !important;
        background: var(--rp-white) !important;
    }

    /* ---------- All-time full inventory modal ---------- */
    .rp-full-inventory-backdrop,
    .rp-full-inventory-backdrop * {
        box-sizing: border-box !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    }

    .rp-full-inventory-backdrop {
        --fi-text: #111827;
        --fi-text-secondary: #344054;
        --fi-muted: #667085;
        --fi-subtle: #98a2b3;
        --fi-border: #e4e7ec;
        --fi-border-strong: #d0d5dd;
        --fi-bg: #f8fafc;
        --fi-white: #ffffff;
        --fi-green: #15803d;
        --fi-green-dark: #166534;
        --fi-blue: #2563eb;

        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483000 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 100vw !important;
        height: 100dvh !important;
        margin: 0 !important;
        padding: 18px !important;
        background: rgba(15, 23, 42, 0.64) !important;
        backdrop-filter: blur(5px) !important;
    }

    .rp-full-inventory-modal {
        width: min(1460px, calc(100vw - 36px)) !important;
        height: min(860px, calc(100dvh - 36px)) !important;
        max-width: calc(100vw - 36px) !important;
        max-height: calc(100dvh - 36px) !important;
        min-width: 0 !important;
        min-height: 0 !important;
        display: grid !important;
        grid-template-rows: auto auto minmax(0, 1fr) !important;
        overflow: hidden !important;
        color: var(--fi-text-secondary) !important;
        background: var(--fi-white) !important;
        border: 1px solid var(--fi-border-strong) !important;
        border-radius: 16px !important;
        box-shadow: 0 28px 90px rgba(15, 23, 42, 0.36) !important;
    }

    .rp-full-inventory-header {
        display: flex !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 18px !important;
        min-width: 0 !important;
        padding: 18px 20px !important;
        background: var(--fi-bg) !important;
        border-bottom: 1px solid var(--fi-border) !important;
    }

    .rp-full-inventory-header > div {
        min-width: 0 !important;
    }

    .rp-full-inventory-header .rp-kicker {
        display: block !important;
        margin-bottom: 4px !important;
        color: var(--fi-green) !important;
        font-size: 11px !important;
        font-weight: 800 !important;
        letter-spacing: 0.06em !important;
        text-transform: uppercase !important;
    }

    .rp-full-inventory-header h3 {
        margin: 0 !important;
        color: var(--fi-text) !important;
        font-size: 20px !important;
        line-height: 1.25 !important;
    }

    .rp-full-inventory-header p {
        max-width: 860px !important;
        margin: 6px 0 0 !important;
        color: var(--fi-muted) !important;
        font-size: 12.5px !important;
        line-height: 1.45 !important;
    }

    .rp-full-inventory-toolbar {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 12px !important;
        min-width: 0 !important;
        padding: 12px 20px !important;
        background: var(--fi-white) !important;
        border-bottom: 1px solid var(--fi-border) !important;
    }

    .rp-full-inventory-toolbar-left,
    .rp-full-inventory-toolbar-right {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 9px !important;
        min-width: 0 !important;
    }

    .rp-full-inventory-toolbar-left {
        flex: 1 1 520px !important;
    }

    .rp-full-inventory-toolbar-right {
        justify-content: flex-end !important;
        flex: 0 1 auto !important;
    }

    .rp-full-inventory-search {
        width: min(520px, 100%) !important;
        min-width: 230px !important;
        height: 40px !important;
        padding: 0 12px !important;
        color: var(--fi-text-secondary) !important;
        font-size: 13px !important;
        background: var(--fi-bg) !important;
        border: 1px solid var(--fi-border-strong) !important;
        border-radius: 8px !important;
        outline: none !important;
    }

    .rp-full-inventory-search:focus {
        border-color: var(--fi-blue) !important;
        background: var(--fi-white) !important;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
    }

    .rp-full-inventory-count {
        color: var(--fi-muted) !important;
        font-size: 12px !important;
        font-weight: 650 !important;
        white-space: nowrap !important;
    }

    .rp-full-inventory-action {
        min-height: 38px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 7px !important;
        padding: 7px 13px !important;
        color: var(--fi-text-secondary) !important;
        font-size: 12.5px !important;
        font-weight: 750 !important;
        white-space: nowrap !important;
        background: var(--fi-white) !important;
        border: 1px solid var(--fi-border-strong) !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: 120ms ease !important;
    }

    .rp-full-inventory-action:hover {
        background: var(--fi-bg) !important;
        border-color: #98a2b3 !important;
    }

    .rp-full-inventory-action.primary {
        color: #ffffff !important;
        background: var(--fi-green) !important;
        border-color: var(--fi-green) !important;
    }

    .rp-full-inventory-action.primary:hover {
        background: var(--fi-green-dark) !important;
        border-color: var(--fi-green-dark) !important;
    }

    .rp-full-inventory-body {
        min-width: 0 !important;
        min-height: 0 !important;
        overflow: auto !important;
        padding: 14px 18px 18px !important;
        background: #fbfcfd !important;
    }

    .rp-full-inventory-table-shell {
        width: 100% !important;
        overflow: auto !important;
        background: var(--fi-white) !important;
        border: 1px solid var(--fi-border) !important;
        border-radius: 10px !important;
    }

    .rp-full-inventory-table {
        width: 100% !important;
        min-width: 1240px !important;
        border-collapse: collapse !important;
        table-layout: auto !important;
        font-size: 13px !important;
        background: var(--fi-white) !important;
    }

    .rp-full-inventory-table thead {
        position: sticky !important;
        top: 0 !important;
        z-index: 3 !important;
    }

    .rp-full-inventory-table thead th {
        padding: 11px 13px !important;
        color: var(--fi-muted) !important;
        font-size: 10.5px !important;
        font-weight: 800 !important;
        letter-spacing: 0.035em !important;
        text-align: left !important;
        text-transform: uppercase !important;
        white-space: nowrap !important;
        background: #f8fafc !important;
        border-bottom: 1px solid var(--fi-border) !important;
    }

    .rp-full-inventory-table tbody td {
        padding: 11px 13px !important;
        color: var(--fi-text-secondary) !important;
        vertical-align: middle !important;
        white-space: nowrap !important;
        background: var(--fi-white) !important;
        border-bottom: 1px solid #eef1f4 !important;
    }

    .rp-full-inventory-table tbody tr:hover td {
        background: #f9fafb !important;
    }

    .rp-full-inventory-table tbody tr:last-child td {
        border-bottom: none !important;
    }

    .rp-full-inventory-table td strong {
        display: block !important;
        color: var(--fi-text) !important;
        font-weight: 700 !important;
    }

    .rp-full-inventory-table td small {
        display: block !important;
        margin-top: 2px !important;
        color: var(--fi-subtle) !important;
        font-size: 11px !important;
    }

    .rp-full-inventory-table .rp-table-state {
        padding: 38px 16px !important;
        color: var(--fi-subtle) !important;
        text-align: center !important;
    }

    .rp-variant-pill {
        display: inline-flex !important;
        align-items: center !important;
        min-height: 25px !important;
        padding: 3px 8px !important;
        color: #1d4ed8 !important;
        font-size: 11.5px !important;
        font-weight: 750 !important;
        background: #eff6ff !important;
        border: 1px solid #bfdbfe !important;
        border-radius: 999px !important;
    }

    .rp-price-cell strong {
        display: block !important;
    }

    .rp-price-cell small {
        display: block !important;
        margin-top: 2px !important;
        color: var(--fi-subtle) !important;
    }

    .rp-history-note {
        margin: 10px 2px 0 !important;
        color: var(--fi-muted) !important;
        font-size: 11.5px !important;
        line-height: 1.45 !important;
    }

    @media (max-width: 860px) {
        .rp-full-inventory-backdrop {
            padding: 8px !important;
        }

        .rp-full-inventory-modal {
            width: calc(100vw - 16px) !important;
            height: calc(100dvh - 16px) !important;
            max-width: calc(100vw - 16px) !important;
            max-height: calc(100dvh - 16px) !important;
            border-radius: 12px !important;
        }

        .rp-full-inventory-header {
            padding: 14px !important;
        }

        .rp-full-inventory-toolbar {
            padding: 10px 14px !important;
        }

        .rp-full-inventory-toolbar-left,
        .rp-full-inventory-toolbar-right {
            width: 100% !important;
        }

        .rp-full-inventory-toolbar-right {
            justify-content: flex-start !important;
        }

        .rp-full-inventory-search {
            width: 100% !important;
        }

        .rp-full-inventory-body {
            padding: 10px !important;
        }
    }

    /* ---------- Print ---------- */
    @media print {
        #sapo-reports-page .rp-filter-card,
        #sapo-reports-page .rp-header-actions,
        #sapo-reports-page .rp-tabs {
            display: none !important;
        }

        #sapo-reports-page .rp-table-container {
            max-height: none !important;
            overflow: visible !important;
        }
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 760px) {
        #sapo-reports-page .rp-header {
            flex-direction: column !important;
            align-items: stretch !important;
        }

        #sapo-reports-page .rp-header-actions {
            width: 100% !important;
        }

        #sapo-reports-page .rp-header-actions button {
            flex: 1 1 auto !important;
        }

        #sapo-reports-page .rp-filter-card {
            flex-direction: column !important;
            align-items: stretch !important;
        }

        #sapo-reports-page .rp-filter-card label,
        #sapo-reports-page .rp-filter-card select,
        #sapo-reports-page .rp-filter-card > button {
            width: 100% !important;
        }
    }
`;

export default function ReportsPage() {
    const { token } = useAuth();

    const [report, setReport] = useState<ReportOverviewData | null>(null);
    const [activeTab, setActiveTab] = useState<ReportTab>('overview');
    const [dateFrom, setDateFrom] = useState(monthStart());
    const [dateTo, setDateTo] = useState(currentDate());
    const [paymentMethod, setPaymentMethod] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    const [
        isFullInventoryOpen,
        setIsFullInventoryOpen,
    ] = useState(false);

    const [
        fullInventorySearch,
        setFullInventorySearch,
    ] = useState('');

    const requestIdRef =
        useRef(
            0,
        );

    const loadReport = useCallback(
        async (): Promise<void> => {
            const requestId =
                requestIdRef.current
                + 1;

            requestIdRef.current =
                requestId;

            if (!token) {
                setReport(
                    null,
                );

                setErrorMessage(
                    'Authentication is required to generate reports.',
                );

                setIsLoading(
                    false,
                );

                return;
            }

            if (
                !dateFrom
                || !dateTo
            ) {
                setErrorMessage(
                    'Select both From and To dates.',
                );

                setIsLoading(
                    false,
                );

                return;
            }

            if (
                dateFrom
                > dateTo
            ) {
                setErrorMessage(
                    'The From date cannot be after the To date.',
                );

                setIsLoading(
                    false,
                );

                return;
            }

            setIsLoading(
                true,
            );

            setErrorMessage(
                '',
            );

            try {
                const response =
                    await getReportOverview(
                        token,
                        {
                            dateFrom,
                            dateTo,
                            paymentMethod,
                            paymentStatus,
                        },
                    );

                if (
                    requestIdRef.current
                    !== requestId
                ) {
                    return;
                }

                setReport(
                    response.data,
                );
            } catch (error) {
                if (
                    requestIdRef.current
                    !== requestId
                ) {
                    return;
                }

                setErrorMessage(
                    error instanceof ApiError
                        ? error.message
                        : 'Unable to generate the report.',
                );
            } finally {
                if (
                    requestIdRef.current
                    === requestId
                ) {
                    setIsLoading(
                        false,
                    );
                }
            }
        },
        [
            token,
            dateFrom,
            dateTo,
            paymentMethod,
            paymentStatus,
        ],
    );

    useEffect(() => {
        void loadReport();
    }, [loadReport]);

    useEffect(() => {
        if (!isFullInventoryOpen) {
            return;
        }

        const previousOverflow =
            document.body
                .style
                .overflow;

        document.body
            .style
            .overflow =
            'hidden';

        const handleKeyDown = (
            event:
                KeyboardEvent,
        ): void => {
            if (
                event.key
                === 'Escape'
            ) {
                setIsFullInventoryOpen(
                    false,
                );
            }
        };

        window.addEventListener(
            'keydown',
            handleKeyDown,
        );

        return () => {
            document.body
                .style
                .overflow =
                previousOverflow;

            window.removeEventListener(
                'keydown',
                handleKeyDown,
            );
        };
    }, [
        isFullInventoryOpen,
    ]);

    const fullInventoryRows =
        allTimeInventoryRows(
            report,
        );

    const filteredFullInventoryRows =
        useMemo(
            () => {
                const search =
                    fullInventorySearch
                        .trim()
                        .toLowerCase();

                if (
                    search === ''
                ) {
                    return fullInventoryRows;
                }

                return fullInventoryRows
                    .filter(
                        (
                            row,
                        ) =>
                            [
                                row.product_name,
                                row.variant_name,
                                row.category.name,
                                row.price_unit,
                                row.stock_unit,
                                row.purchase_cost,
                                row.selling_price,
                                row.secondary_selling_price,
                            ]
                                .filter(
                                    (
                                        value,
                                    ) =>
                                        value
                                        !== null
                                        && value
                                        !== undefined,
                                )
                                .some(
                                    (
                                        value,
                                    ) =>
                                        String(
                                            value,
                                        )
                                            .toLowerCase()
                                            .includes(
                                                search,
                                            ),
                                ),
                    );
            },
            [
                fullInventoryRows,
                fullInventorySearch,
            ],
        );

    const chartMaximum = useMemo(
        () => {
            if (!report) {
                return 1;
            }

            return Math.max(
                1,
                ...report.daily_series.flatMap(
                    (point) => [
                        point.sales,
                        point.collections,
                        point.expenses,
                        point.returns,
                    ],
                ),
            );
        },
        [report],
    );

    return (
        <div id="sapo-reports-page">
            <style>
                {reportsPageStyles}
            </style>

            <section className="rp-header">
                <div>
                    <span className="rp-kicker">Business intelligence</span>
                    <h2>Reports</h2>
                    <p>Review sales, profit, expenses, dues, products and stock values.</p>
                </div>

                <div className="rp-header-actions">
                    <button
                        type="button"
                        className="rp-secondary-button"
                        disabled={!report}
                        onClick={() => { window.print(); }}
                    >
                        Print Report
                    </button>

                    <button
                        type="button"
                        className="rp-primary-button"
                        disabled={!report}
                        onClick={() => {
                            if (report) {
                                downloadCsv(report);
                            }
                        }}
                    >
                        Export CSV
                    </button>
                </div>
            </section>

            <section className="rp-filter-card">
                <label>
                    <span>From</span>
                    <input
                        type="date"
                        value={dateFrom}
                        max={dateTo}
                        onChange={(event) => { setDateFrom(event.target.value); }}
                    />
                </label>

                <label>
                    <span>To</span>
                    <input
                        type="date"
                        value={dateTo}
                        min={dateFrom}
                        onChange={(event) => { setDateTo(event.target.value); }}
                    />
                </label>

                <label>
                    <span>Payment Method</span>
                    <select
                        value={paymentMethod}
                        onChange={(event) => { setPaymentMethod(event.target.value); }}
                    >
                        <option value="">All Methods</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                    </select>
                </label>

                <label>
                    <span>Payment Status</span>
                    <select
                        value={paymentStatus}
                        onChange={(event) => { setPaymentStatus(event.target.value); }}
                    >
                        <option value="">All Statuses</option>
                        <option value="paid">Paid</option>
                        <option value="partial">Partial</option>
                        <option value="due">Due</option>
                    </select>
                </label>

                <button
                    type="button"
                    className="rp-primary-button"
                    disabled={isLoading}
                    onClick={() => { void loadReport(); }}
                >
                    {isLoading ? 'Generating...' : 'Generate Report'}
                </button>
            </section>

            {errorMessage && (
                <div className="rp-form-alert">{errorMessage}</div>
            )}

            <nav className="rp-tabs">
                <button
                    type="button"
                    className={activeTab === 'overview' ? 'rp-tab-active' : ''}
                    onClick={() => { setActiveTab('overview'); }}
                >
                    Overview
                </button>

                <button
                    type="button"
                    className={activeTab === 'products' ? 'rp-tab-active' : ''}
                    onClick={() => { setActiveTab('products'); }}
                >
                    Products
                </button>

                <button
                    type="button"
                    className={activeTab === 'expenses' ? 'rp-tab-active' : ''}
                    onClick={() => { setActiveTab('expenses'); }}
                >
                    Expenses
                </button>

                <button
                    type="button"
                    className={activeTab === 'dues' ? 'rp-tab-active' : ''}
                    onClick={() => { setActiveTab('dues'); }}
                >
                    Customer Dues
                </button>

                <button
                    type="button"
                    className={activeTab === 'inventory' ? 'rp-tab-active' : ''}
                    onClick={() => { setActiveTab('inventory'); }}
                >
                    Inventory
                </button>
            </nav>

            {isLoading && !report ? (
                <div className="rp-page-state">
                    <div className="rp-spinner" />
                    <span>Generating report...</span>
                </div>
            ) : report ? (
                <>
                    {activeTab === 'overview' && (
                        <>
                            <section className="rp-summary-grid">
                                <article>
                                    <span>Sales Total</span>
                                    <strong>{currencyFormatter.format(report.summary.sales_total)}</strong>
                                    <small>{report.summary.sales_count} transactions</small>
                                </article>

                                <article>
                                    <span>Collected</span>
                                    <strong>{currencyFormatter.format(report.summary.collected_amount)}</strong>
                                </article>

                                <article>
                                    <span>Due Amount</span>
                                    <strong className="rp-warning-value">
                                        {currencyFormatter.format(report.summary.due_amount)}
                                    </strong>
                                </article>

                                <article>
                                    <span>Gross Profit</span>
                                    <strong>{currencyFormatter.format(report.summary.gross_profit)}</strong>
                                </article>

                                <article>
                                    <span>Returns</span>
                                    <strong className="rp-negative-value">
                                        {currencyFormatter.format(report.summary.return_refund)}
                                    </strong>
                                    <small>{report.summary.return_count} returns</small>
                                </article>

                                <article>
                                    <span>Expenses</span>
                                    <strong className="rp-negative-value">
                                        {currencyFormatter.format(report.summary.expense_total)}
                                    </strong>
                                </article>

                                <article>
                                    <span>Final Net Profit</span>
                                    <strong
                                        className={
                                            report.summary.final_net_profit >= 0
                                                ? 'rp-positive-value'
                                                : 'rp-negative-value'
                                        }
                                    >
                                        {currencyFormatter.format(report.summary.final_net_profit)}
                                    </strong>
                                    <small>After returns and expenses</small>
                                </article>
                            </section>

                            <section className="rp-two-column">
                                <article className="rp-card">
                                    <header className="rp-card-header">
                                        <div>
                                            <span className="rp-kicker">
                                                {report.period.date_from} to {report.period.date_to}
                                            </span>
                                            <h3>Daily Financial Activity</h3>
                                        </div>
                                    </header>

                                    <div className="rp-legend">
                                        <span><i className="rp-legend-sales" />Sales</span>
                                        <span><i className="rp-legend-collections" />Collections</span>
                                        <span><i className="rp-legend-expenses" />Expenses</span>
                                        <span><i className="rp-legend-returns" />Returns</span>
                                    </div>

                                    <div className="rp-bar-chart">
                                        {report.daily_series.map((point) => (
                                            <div className="rp-chart-row" key={point.date}>
                                                <span>{formatDate(point.date)}</span>

                                                <div>
                                                    <div
                                                        className="rp-bar rp-sales-bar"
                                                        style={{ width: `${(point.sales / chartMaximum) * 100}%` }}
                                                    />
                                                    <div
                                                        className="rp-bar rp-collections-bar"
                                                        style={{ width: `${(point.collections / chartMaximum) * 100}%` }}
                                                    />
                                                    <div
                                                        className="rp-bar rp-expenses-bar"
                                                        style={{ width: `${(point.expenses / chartMaximum) * 100}%` }}
                                                    />
                                                    <div
                                                        className="rp-bar rp-returns-bar"
                                                        style={{ width: `${(point.returns / chartMaximum) * 100}%` }}
                                                    />
                                                </div>

                                                <strong>{currencyFormatter.format(point.sales)}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </article>

                                <article className="rp-card">
                                    <header className="rp-card-header">
                                        <div>
                                            <span className="rp-kicker">Collections</span>
                                            <h3>Payment Methods</h3>
                                        </div>
                                    </header>

                                    <div className="rp-payment-list">
                                        {report.payment_breakdown.length === 0 ? (
                                            <div className="rp-table-state">No payments found.</div>
                                        ) : (
                                            report.payment_breakdown.map((payment) => (
                                                <article key={payment.payment_method}>
                                                    <div>
                                                        <strong>{paymentMethodName(payment.payment_method)}</strong>
                                                        <span>{payment.transactions} transactions</span>
                                                    </div>
                                                    <strong>{currencyFormatter.format(payment.total)}</strong>
                                                </article>
                                            ))
                                        )}
                                    </div>
                                </article>
                            </section>
                        </>
                    )}

                    {activeTab === 'products' && (
                        <section className="rp-card">
                            <header className="rp-card-header">
                                <div>
                                    <span className="rp-kicker">Sales performance</span>
                                    <h3>Product Report</h3>
                                </div>
                            </header>

                            <div className="rp-table-container">
                                <table className="rp-table">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Category</th>
                                            <th>Quantity</th>
                                            <th>Sales</th>
                                            <th>Cost</th>
                                            <th>Gross Profit</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {report.product_performance.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="rp-table-state">
                                                    No product sales found.
                                                </td>
                                            </tr>
                                        ) : (
                                            report.product_performance.map((product) => (
                                                <tr key={product.id}>
                                                    <td><strong>{product.name}</strong></td>
                                                    <td>{product.category.name}</td>
                                                    <td>{product.quantity_sold} {product.unit}</td>
                                                    <td>{currencyFormatter.format(product.sales_total)}</td>
                                                    <td>{currencyFormatter.format(product.cost_total)}</td>
                                                    <td>
                                                        <strong
                                                            className={
                                                                product.gross_profit >= 0
                                                                    ? 'rp-positive-value'
                                                                    : 'rp-negative-value'
                                                            }
                                                        >
                                                            {currencyFormatter.format(product.gross_profit)}
                                                        </strong>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {activeTab === 'expenses' && (
                        <section className="rp-card">
                            <header className="rp-card-header">
                                <div>
                                    <span className="rp-kicker">Business costs</span>
                                    <h3>Expense Category Report</h3>
                                </div>
                            </header>

                            <div className="rp-table-container">
                                <table className="rp-table">
                                    <thead>
                                        <tr>
                                            <th>Category</th>
                                            <th>Records</th>
                                            <th>Total Amount</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {report.expense_categories.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="rp-table-state">
                                                    No expenses found.
                                                </td>
                                            </tr>
                                        ) : (
                                            report.expense_categories.map((category) => (
                                                <tr key={category.id}>
                                                    <td><strong>{category.name}</strong></td>
                                                    <td>{category.expense_count}</td>
                                                    <td>
                                                        <strong className="rp-negative-value">
                                                            {currencyFormatter.format(category.total_amount)}
                                                        </strong>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {activeTab === 'dues' && (
                        <section className="rp-card">
                            <header className="rp-card-header">
                                <div>
                                    <span className="rp-kicker">Accounts receivable</span>
                                    <h3>Customer Due Report</h3>
                                </div>
                            </header>

                            <div className="rp-table-container">
                                <table className="rp-table">
                                    <thead>
                                        <tr>
                                            <th>Customer</th>
                                            <th>Mobile</th>
                                            <th>Due Sales</th>
                                            <th>Sales Total</th>
                                            <th>Paid</th>
                                            <th>Due</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {report.customer_dues.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="rp-table-state">
                                                    No customer dues found.
                                                </td>
                                            </tr>
                                        ) : (
                                            report.customer_dues.map((customer) => (
                                                <tr key={customer.id}>
                                                    <td>
                                                        <strong>{customer.name}</strong>
                                                        <small>{customer.customer_code}</small>
                                                    </td>
                                                    <td>{customer.mobile ?? '—'}</td>
                                                    <td>{customer.due_sales}</td>
                                                    <td>{currencyFormatter.format(customer.sales_total)}</td>
                                                    <td>{currencyFormatter.format(customer.paid_amount)}</td>
                                                    <td>
                                                        <strong className="rp-warning-value">
                                                            {currencyFormatter.format(customer.due_amount)}
                                                        </strong>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {activeTab === 'inventory' && (
                        <>
                            <section className="rp-summary-grid">
                                <article>
                                    <span>Stock Quantity</span>

                                    <strong className="rp-inventory-quantity">
                                        {inventorySummaryQuantityText(
                                            report
                                                .inventory
                                                .summary,
                                        )}
                                    </strong>
                                </article>

                                <article>
                                    <span>Purchase Value</span>

                                    <strong>
                                        {currencyFormatter.format(
                                            report
                                                .inventory
                                                .summary
                                                .purchase_value,
                                        )}
                                    </strong>
                                </article>

                                <article>
                                    <span>Retail Value</span>

                                    <strong>
                                        {currencyFormatter.format(
                                            report
                                                .inventory
                                                .summary
                                                .retail_value,
                                        )}
                                    </strong>
                                </article>

                                <article>
                                    <span>Expiring Batches</span>

                                    <strong className="rp-warning-value">
                                        {report
                                            .inventory
                                            .summary
                                            .expiring_batch_count}
                                    </strong>
                                </article>

                                <article>
                                    <span>Expired Batches</span>

                                    <strong className="rp-negative-value">
                                        {report
                                            .inventory
                                            .summary
                                            .expired_batch_count}
                                    </strong>
                                </article>
                            </section>

                            <section className="rp-card">
                                <header className="rp-card-header">
                                    <div>
                                        <span className="rp-kicker">
                                            Current stock
                                        </span>

                                        <h3>
                                            Inventory Value Report
                                        </h3>

                                        <small className="rp-current-stock-note">
                                            Inventory is a live current-stock snapshot and is not limited by the selected sales-report date range.
                                        </small>
                                    </div>

                                    <button
                                        type="button"
                                        className="rp-primary-button"
                                        onClick={() => {
                                            setFullInventorySearch(
                                                '',
                                            );

                                            setIsFullInventoryOpen(
                                                true,
                                            );
                                        }}
                                    >
                                        View All-Time Full Inventory
                                    </button>
                                </header>

                                <div className="rp-table-container">
                                    <table className="rp-table">
                                        <thead>
                                            <tr>
                                                <th>Product</th>
                                                <th>Category</th>
                                                <th>Physical Stock</th>
                                                <th>Batches</th>
                                                <th>Purchase Value</th>
                                                <th>Retail Value</th>
                                                <th>Nearest Expiry</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {report
                                                .inventory
                                                .products
                                                .length
                                                === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={7}
                                                        className="rp-table-state"
                                                    >
                                                        No available stock.
                                                    </td>
                                                </tr>
                                            ) : (
                                                report
                                                    .inventory
                                                    .products
                                                    .map(
                                                        (
                                                            product,
                                                        ) => (
                                                            <tr
                                                                key={
                                                                    product.id
                                                                }
                                                            >
                                                                <td>
                                                                    <strong>
                                                                        {product.name}
                                                                    </strong>
                                                                </td>

                                                                <td>
                                                                    {product
                                                                        .category
                                                                        .name}
                                                                </td>

                                                                <td className="rp-inventory-quantity">
                                                                    {inventoryProductQuantityText(
                                                                        product,
                                                                    )}
                                                                </td>

                                                                <td>
                                                                    {product
                                                                        .batch_count}
                                                                </td>

                                                                <td>
                                                                    {currencyFormatter.format(
                                                                        product
                                                                            .purchase_value,
                                                                    )}
                                                                </td>

                                                                <td>
                                                                    {currencyFormatter.format(
                                                                        product
                                                                            .retail_value,
                                                                    )}
                                                                </td>

                                                                <td>
                                                                    {formatDate(
                                                                        product
                                                                            .nearest_expiry,
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </>
                    )}
                </>
            ) : null}
            {isFullInventoryOpen
                ? createPortal(
                    <div
                        className="rp-full-inventory-backdrop"
                        role="presentation"
                        onMouseDown={(
                            event,
                        ) => {
                            if (
                                event.target
                                === event.currentTarget
                            ) {
                                setIsFullInventoryOpen(
                                    false,
                                );
                            }
                        }}
                    >
                        <section
                            className="rp-full-inventory-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-label="All-time full inventory"
                        >
                            <header className="rp-full-inventory-header">
                                <div>
                                    <span className="rp-kicker">
                                        All-time stock history
                                    </span>

                                    <h3>
                                        Full Inventory by Variant and Price
                                    </h3>

                                    {/* <p>
                                        Each variant is displayed separately.
                                        If the same variant has different purchase
                                        or sale prices, every unique price combination
                                        is displayed as a separate row. Only rows
                                        that still have current remaining inventory
                                        are shown.
                                    </p> */}
                                </div>

                                <button
                                    type="button"
                                    className="rp-full-inventory-action"
                                    onClick={() => {
                                        setIsFullInventoryOpen(
                                            false,
                                        );
                                    }}
                                >
                                    Close
                                </button>
                            </header>

                            <div className="rp-full-inventory-toolbar">
                                <div className="rp-full-inventory-toolbar-left">
                                    <input
                                        type="search"
                                        className="rp-full-inventory-search"
                                        value={
                                            fullInventorySearch
                                        }
                                        placeholder="Search product, variant, category, unit or price"
                                        autoFocus
                                        onChange={(
                                            event,
                                        ) => {
                                            setFullInventorySearch(
                                                event
                                                    .target
                                                    .value,
                                            );
                                        }}
                                    />

                                    <span className="rp-full-inventory-count">
                                        Showing
                                        {' '}
                                        {
                                            filteredFullInventoryRows
                                                .length
                                        }
                                        {' '}
                                        of
                                        {' '}
                                        {
                                            fullInventoryRows
                                                .length
                                        }
                                        {' '}
                                        variant / price rows
                                    </span>
                                </div>

                                <div className="rp-full-inventory-toolbar-right">
                                    <button
                                        type="button"
                                        className="rp-full-inventory-action"
                                        disabled={
                                            filteredFullInventoryRows
                                                .length
                                            === 0
                                        }
                                        onClick={() => {
                                            downloadFullInventoryExcel(
                                                filteredFullInventoryRows,
                                            );
                                        }}
                                    >
                                        Download Excel
                                    </button>

                                    <button
                                        type="button"
                                        className="rp-full-inventory-action primary"
                                        disabled={
                                            filteredFullInventoryRows
                                                .length
                                            === 0
                                        }
                                        onClick={() => {
                                            downloadFullInventoryPdf(
                                                filteredFullInventoryRows,
                                            );
                                        }}
                                    >
                                        Download PDF
                                    </button>
                                </div>
                            </div>

                            <div className="rp-full-inventory-body">
                                <div className="rp-full-inventory-table-shell">
                                    <table className="rp-full-inventory-table">
                                        <thead>
                                            <tr>
                                                <th>
                                                    Product
                                                </th>

                                                <th>
                                                    Variant
                                                </th>

                                                <th>
                                                    Category
                                                </th>

                                                <th>
                                                    Cost / 1 Unit
                                                </th>

                                                <th>
                                                    Sale Price / 1 Unit
                                                </th>

                                                <th>
                                                    Loose Sale Price
                                                </th>

                                                <th>
                                                    All-Time Purchased
                                                </th>

                                                <th>
                                                    Current Remaining
                                                </th>

                                                <th>
                                                    Purchase Lots
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {filteredFullInventoryRows.length
                                                === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={
                                                            9
                                                        }
                                                        className="rp-table-state"
                                                    >
                                                        No matching all-time inventory rows found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredFullInventoryRows
                                                    .map(
                                                        (
                                                            row,
                                                        ) => (
                                                            <tr
                                                                key={
                                                                    row
                                                                        .row_key
                                                                }
                                                            >
                                                                <td>
                                                                    <strong>
                                                                        {
                                                                            row
                                                                                .product_name
                                                                        }
                                                                    </strong>

                                                                    <small>
                                                                        Price unit:
                                                                        {' '}
                                                                        {
                                                                            row
                                                                                .price_unit
                                                                        }
                                                                    </small>
                                                                </td>

                                                                <td>
                                                                    <span className="rp-variant-pill">
                                                                        {
                                                                            row
                                                                                .variant_name
                                                                        }
                                                                    </span>
                                                                </td>

                                                                <td>
                                                                    {
                                                                        row
                                                                            .category
                                                                            .name
                                                                    }
                                                                </td>

                                                                <td className="rp-price-cell">
                                                                    <strong>
                                                                        {optionalCurrency(
                                                                            row
                                                                                .purchase_cost,
                                                                        )}
                                                                    </strong>

                                                                    <small>
                                                                        per 1
                                                                        {' '}
                                                                        {
                                                                            row
                                                                                .price_unit
                                                                        }
                                                                    </small>
                                                                </td>

                                                                <td className="rp-price-cell">
                                                                    <strong>
                                                                        {optionalCurrency(
                                                                            row
                                                                                .selling_price,
                                                                        )}
                                                                    </strong>

                                                                    <small>
                                                                        per 1
                                                                        {' '}
                                                                        {
                                                                            row
                                                                                .price_unit
                                                                        }
                                                                    </small>
                                                                </td>

                                                                <td className="rp-price-cell">
                                                                    {row
                                                                        .secondary_unit
                                                                        ? (
                                                                            <>
                                                                                <strong>
                                                                                    {optionalCurrency(
                                                                                        row
                                                                                            .secondary_selling_price,
                                                                                    )}
                                                                                </strong>

                                                                                <small>
                                                                                    per 1
                                                                                    {' '}
                                                                                    {
                                                                                        row
                                                                                            .secondary_unit
                                                                                    }
                                                                                </small>
                                                                            </>
                                                                        )
                                                                        : (
                                                                            <span>
                                                                                —
                                                                            </span>
                                                                        )}
                                                                </td>

                                                                <td>
                                                                    {formatQuantity(
                                                                        row
                                                                            .total_received_quantity,
                                                                    )}
                                                                    {' '}
                                                                    {
                                                                        row
                                                                            .stock_unit
                                                                    }
                                                                </td>

                                                                <td>
                                                                    {formatQuantity(
                                                                        row
                                                                            .remaining_quantity,
                                                                    )}
                                                                    {' '}
                                                                    {
                                                                        row
                                                                            .stock_unit
                                                                    }
                                                                </td>

                                                                <td>
                                                                    {
                                                                        row
                                                                            .batch_count
                                                                    }
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <p className="rp-history-note">
                                    The table is grouped by exact product,
                                    exact variant, purchase cost, selling price,
                                    secondary selling price and unit conversion.
                                    Rows with zero current remaining inventory are
                                    hidden. PDF and Excel export only the currently
                                    visible/search-filtered rows.
                                </p>
                            </div>
                        </section>
                    </div>,
                    document.body,
                )
                : null}

        </div>
    );
}