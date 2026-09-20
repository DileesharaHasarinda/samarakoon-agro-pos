import PosPage
    from './PosPage';

/*
 * Training / practice billing screen.
 *
 * Reuses the catalogue/search/cart shell from PosPage but runs in
 * catalogMode, which is intentionally isolated from the real sale flow:
 *
 * - every catalogue product can be selected,
 * - selling prices are not used,
 * - payment is not collected,
 * - stock is not validated or deducted,
 * - no Sale / SalePayment / due / stock movement is created,
 * - the output is a local printable TRAINING BILL only.
 */
export default function AllProductsSalePage() {
    return (
        <PosPage
            catalogMode
        />
    );
}
