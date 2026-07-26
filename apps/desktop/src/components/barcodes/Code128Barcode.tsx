import {
    useMemo,
} from 'react';

const CODE_128_PATTERNS = [
    '212222',
    '222122',
    '222221',
    '121223',
    '121322',
    '131222',
    '122213',
    '122312',
    '132212',
    '221213',
    '221312',
    '231212',
    '112232',
    '122132',
    '122231',
    '113222',
    '123122',
    '123221',
    '223211',
    '221132',
    '221231',
    '213212',
    '223112',
    '312131',
    '311222',
    '321122',
    '321221',
    '312212',
    '322112',
    '322211',
    '212123',
    '212321',
    '232121',
    '111323',
    '131123',
    '131321',
    '112313',
    '132113',
    '132311',
    '211313',
    '231113',
    '231311',
    '112133',
    '112331',
    '132131',
    '113123',
    '113321',
    '133121',
    '313121',
    '211331',
    '231131',
    '213113',
    '213311',
    '213131',
    '311123',
    '311321',
    '331121',
    '312113',
    '312311',
    '332111',
    '314111',
    '221411',
    '431111',
    '111224',
    '111422',
    '121124',
    '121421',
    '141122',
    '141221',
    '112214',
    '112412',
    '122114',
    '122411',
    '142112',
    '142211',
    '241211',
    '221114',
    '413111',
    '241112',
    '134111',
    '111242',
    '121142',
    '121241',
    '114212',
    '124112',
    '124211',
    '411212',
    '421112',
    '421211',
    '212141',
    '214121',
    '412121',
    '111143',
    '111341',
    '131141',
    '114113',
    '114311',
    '411113',
    '411311',
    '113141',
    '114131',
    '311141',
    '411131',
    '211412',
    '211214',
    '211232',
    '2331112',
] as const;

interface Code128BarcodeProps {
    value: string;
    height?: number;
    showText?: boolean;
    className?: string;
}

interface BarcodeRect {
    x: number;
    width: number;
}

function encodeCode128B(
    value: string,
): number[] {
    if (!value) {
        throw new Error(
            'Barcode value is required.',
        );
    }

    const values: number[] = [];

    for (
        const character
        of value
    ) {
        const characterCode =
            character.charCodeAt(0);

        if (
            characterCode < 32
            || characterCode > 126
        ) {
            throw new Error(
                'Code 128B supports printable ASCII characters only.',
            );
        }

        values.push(
            characterCode - 32,
        );
    }

    const startCode = 104;

    let checksum =
        startCode;

    values.forEach(
        (
            code,
            index,
        ) => {
            checksum +=
                code
                * (index + 1);
        },
    );

    checksum %= 103;

    return [
        startCode,
        ...values,
        checksum,
        106,
    ];
}

function buildBarcode(
    value: string,
): {
    rects: BarcodeRect[];
    width: number;
} {
    const quietZone = 10;

    const codes =
        encodeCode128B(
            value,
        );

    const rects:
        BarcodeRect[] = [];

    let cursor =
        quietZone;

    codes.forEach(
        (
            code,
            codeIndex,
        ) => {
            const pattern =
                CODE_128_PATTERNS[
                code
                ];

            pattern
                .split('')
                .forEach(
                    (
                        part,
                        partIndex,
                    ) => {
                        const width =
                            Number(part);

                        if (
                            partIndex % 2
                            === 0
                        ) {
                            rects.push({
                                x: cursor,
                                width,
                            });
                        }

                        cursor +=
                            width;
                    },
                );

            /*
             * The stop pattern already contains
             * the final termination bar.
             */
            if (
                codeIndex
                === codes.length - 1
            ) {
                return;
            }
        },
    );

    return {
        rects,

        width:
            cursor
            + quietZone,
    };
}

export default function Code128Barcode({
    value,
    height = 52,
    showText = true,
    className = '',
}: Code128BarcodeProps) {
    const barcode =
        useMemo(
            () => {
                try {
                    return buildBarcode(
                        value,
                    );
                } catch {
                    return null;
                }
            },
            [value],
        );

    if (!barcode) {
        return (
            <div className={className}>
                Invalid barcode
            </div>
        );
    }

    const textHeight =
        showText
            ? 17
            : 0;

    const totalHeight =
        height
        + textHeight;

    return (
        <svg
            className={className}
            viewBox={`0 0 ${barcode.width} ${totalHeight}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`Barcode ${value}`}
        >
            <rect
                x="0"
                y="0"
                width={barcode.width}
                height={height}
                fill="#ffffff"
            />

            {barcode.rects.map(
                (
                    rect,
                    index,
                ) => (
                    <rect
                        key={`${rect.x}-${index}`}
                        x={rect.x}
                        y="0"
                        width={rect.width}
                        height={height}
                        fill="#000000"
                    />
                ),
            )}

            {showText && (
                <text
                    x={
                        barcode.width / 2
                    }
                    y={
                        height + 13
                    }
                    textAnchor="middle"
                    fontSize="10"
                    fontFamily="monospace"
                    fill="#000000"
                >
                    {value}
                </text>
            )}
        </svg>
    );
}