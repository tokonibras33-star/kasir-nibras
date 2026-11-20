export type CustomerType = "UMUM" | "MEMBER" | "AGEN" | "ONLINE" | "RESELLER";

export interface CartItem {
  cartId: string;
  productId: string;
  variantId: string;
  name: string;
  color: string;
  size: string;
  brand: string;
  category: string;
  series: string;
  price: number;
  labelPrice: number;
  buyPrice: number;
  buyDiscount: string;
  storeDiscountPercent: number;
  storeDiscountNominal: number;
  quantity: number;
  stock: number;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  address: string;
  discount: number;
  branch: string;
  registrationDate: string;
}

export interface Agent {
  id: string;
  name: string;
  phone: string;
  address: string;
  discount: number;
  branch: string;
  registrationDate: string;
}

export interface Reseller {
  id: string;
  name: string;
  phone: string;
  address: string;
  discount: number;
  branch: string;
  registrationDate: string;
}

export interface Voucher {
  id: string;
  code: string;
  discount: number;
  isUsed: boolean;
}

export const LOGO_URL =
  "https://res.cloudinary.com/dqujkgwah/image/upload/v1775115570/nibras_house-removebg-preview_gwdzut.png";

export const DEFAULT_CARD_BG =
  "https://res.cloudinary.com/dgsxujjb1/image/upload/v1778132431/KartuMember_IndahFashion_1_lun0a1.png";

export const formatCurrencyInput = (val: string | number) => {
  if (val === undefined || val === null || val === "") return "";
  const num = typeof val === "string" ? val.replace(/[^0-9]/g, "") : Math.round(val).toString();
  if (!num) return "";
  return "Rp " + parseInt(num, 10).toLocaleString("id-ID");
};

export const parseCurrencyInput = (val: string) => {
  return val.replace(/[^0-9]/g, "");
};

export const generateSearchTokens = (
  name: string,
  brand: string,
  category: string,
  series: string,
  variants: any[]
) => {
  const tokens = new Set<string>();
  const add = (val: string) => {
    if (!val) return;
    val
      .toLowerCase()
      .split(/[\s-/]+/)
      .forEach((t) => {
        if (t && t.length > 0) tokens.add(t);
      });
  };
  add(name);
  add(brand);
  add(category);
  add(series);
  variants.forEach((v) => {
    add(v.color);
    add(v.size);
  });
  return Array.from(tokens);
};

export const formatWhatsAppPhone = (rawPhone?: string) => {
  const digits = (rawPhone || "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
};

export const getItemUnitNetPrice = (item: any): number => {
  if (!item) return 0;
  const labelPrice = Number(item.labelPrice ?? item.price ?? 0);
  const pct = Number(item.storeDiscountPercent || 0);
  const nom = Number(item.storeDiscountNominal || 0);
  if (pct > 0) return Math.max(0, labelPrice - (labelPrice * pct) / 100);
  if (nom > 0) return Math.max(0, labelPrice - nom);
  return Math.max(0, Number(item.price ?? labelPrice));
};

export interface TrxReturnSummary {
  hasReturn: boolean;
  isDeducted: boolean;
  totalRefund: number;
  originalTotal: number;
  netTotal: number;
  originalPaid: number;
  netPaid: number;
  refundFromPaid: number;
  cashRefunded: number;
  transferRefunded: number;
  qrisRefunded: number;
  netRemaining: number;
  allReturned: boolean;
  effectiveStatus: "RETURNED" | "DP" | "COMPLETED";
  returnedQtyMap: Record<string, number>;
  returnableItems: any[];
}

export const getTrxReturnSummary = (trx: any): TrxReturnSummary => {
  if (!trx) {
    return {
      hasReturn: false,
      isDeducted: false,
      totalRefund: 0,
      originalTotal: 0,
      netTotal: 0,
      originalPaid: 0,
      netPaid: 0,
      refundFromPaid: 0,
      cashRefunded: 0,
      transferRefunded: 0,
      qrisRefunded: 0,
      netRemaining: 0,
      allReturned: false,
      effectiveStatus: "COMPLETED",
      returnedQtyMap: {},
      returnableItems: [],
    };
  }

  const returnItems: any[] = Array.isArray(trx.returnLog?.items) ? trx.returnLog.items : [];
  const hasReturn = returnItems.length > 0;
  const isDeducted = Boolean(trx.returnLog?.isDeductedFromTotal);

  const returnedQtyMap: Record<string, number> = {};
  let computedRefund = 0;
  returnItems.forEach((item: any) => {
    const key = `${item.productId}-${item.variantId}`;
    const qty = Number(item.quantity || 0);
    returnedQtyMap[key] = (returnedQtyMap[key] || 0) + qty;
    computedRefund += getItemUnitNetPrice(item) * qty;
  });

  const totalRefund = hasReturn ? Number(trx.returnLog?.totalRefund ?? computedRefund) : 0;
  const rawTotal = Number(trx.total || 0);
  const rawPaid = Number(trx.paidAmount ?? rawTotal);

  const originalTotal =
    trx.originalTotal !== undefined
      ? Number(trx.originalTotal)
      : isDeducted
      ? rawTotal + totalRefund
      : rawTotal;

  const netTotal = isDeducted ? Math.max(0, rawTotal) : Math.max(0, originalTotal - totalRefund);

  const originalPaid =
    trx.originalPaidAmount !== undefined
      ? Number(trx.originalPaidAmount)
      : isDeducted
      ? rawPaid + Number(trx.returnLog?.refundFromPaid ?? 0)
      : rawPaid;

  const netPaid = isDeducted ? Math.max(0, Math.min(rawPaid, netTotal)) : Math.max(0, Math.min(originalPaid, netTotal));
  const refundFromPaid = isDeducted
    ? Number(trx.returnLog?.refundFromPaid ?? Math.max(0, originalPaid - netPaid))
    : Math.max(0, originalPaid - netPaid);

  let cashRefunded = 0;
  let transferRefunded = 0;
  let qrisRefunded = 0;

  if (refundFromPaid > 0) {
    if (trx.returnLog?.cashRefunded !== undefined && isDeducted) {
      cashRefunded = Number(trx.returnLog.cashRefunded || 0);
      transferRefunded = Number(trx.returnLog.transferRefunded || 0);
      qrisRefunded = Number(trx.returnLog.qrisRefunded || 0);
    } else if (trx.paymentBreakdown) {
      const origCash = Number(trx.originalPaymentBreakdown?.cash ?? trx.paymentBreakdown.cash ?? 0);
      cashRefunded = Math.min(origCash, refundFromPaid);
      const remRefund = Math.max(0, refundFromPaid - cashRefunded);
      const otherMethod = String(trx.paymentBreakdown.otherMethod || "").toUpperCase();
      if (otherMethod === "TRANSFER") transferRefunded = remRefund;
      else if (otherMethod === "QRIS") qrisRefunded = remRefund;
    } else {
      const method = String(trx.paymentMethod || "CASH").toUpperCase();
      if (method.includes("CASH")) cashRefunded = refundFromPaid;
      else if (method === "TRANSFER") transferRefunded = refundFromPaid;
      else if (method === "QRIS") qrisRefunded = refundFromPaid;
    }
  }

  const netRemaining = Math.max(0, netTotal - netPaid);

  const sourceItems: any[] = Array.isArray(trx.originalItems)
    ? trx.originalItems
    : Array.isArray(trx.items)
    ? trx.items
    : [];

  const returnableItems = sourceItems
    .map((item: any) => {
      const key = `${item.productId}-${item.variantId}`;
      const alreadyReturned = returnedQtyMap[key] || 0;
      const origQty = Number(item.quantity || 0);
      const remainingQty = isDeducted && !trx.originalItems ? origQty : Math.max(0, origQty - alreadyReturned);
      if (remainingQty <= 0) return null;
      return {
        ...item,
        originalQuantity: origQty,
        alreadyReturnedQuantity: alreadyReturned,
        quantity: remainingQty,
      };
    })
    .filter(Boolean);

  const allReturned =
    trx.status === "RETURNED" || (hasReturn && (netTotal === 0 || returnableItems.length === 0));

  const effectiveStatus: "RETURNED" | "DP" | "COMPLETED" = allReturned
    ? "RETURNED"
    : netRemaining > 0
    ? "DP"
    : "COMPLETED";

  return {
    hasReturn,
    isDeducted,
    totalRefund,
    originalTotal,
    netTotal,
    originalPaid,
    netPaid,
    refundFromPaid,
    cashRefunded,
    transferRefunded,
    qrisRefunded,
    netRemaining,
    allReturned,
    effectiveStatus,
    returnedQtyMap,
    returnableItems,
  };
};

export const buildReceiptWhatsAppMessage = (
  trx: any,
  options: {
    customStoreName: string;
    displayStoreName: string;
    customStoreAddress: string;
    customStorePhone: string;
    cashierName: string;
  }
): string => {
  const { customStoreName, displayStoreName, customStoreAddress, customStorePhone, cashierName } = options;
  const storeTitle = (customStoreName || `Nibras House ${displayStoreName}`).toUpperCase();
  const trxDateStr = trx.date?.toDate?.() ? trx.date.toDate().toLocaleString("id-ID") : "Baru saja";
  const summary = getTrxReturnSummary(trx);
  const itemsList = Array.isArray(trx.originalItems)
    ? trx.originalItems
    : Array.isArray(trx.items)
    ? trx.items
    : [];
  const totalQty = itemsList.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);

  const itemLines = itemsList.map((item: any, idx: number) => {
    const labelPrice = item.labelPrice || item.price || 0;
    const qty = item.quantity || 1;
    const itemDisc =
      (item.storeDiscountPercent > 0
        ? (labelPrice * item.storeDiscountPercent) / 100
        : item.storeDiscountNominal || 0) * qty;
    const lineTotal = Math.max(0, labelPrice * qty - itemDisc);
    const variantInfo = [item.color, item.size].filter(Boolean).join("/");
    const discText = itemDisc > 0 ? ` (Disc Rp${itemDisc.toLocaleString("id-ID")})` : "";
    return `${idx + 1}. *${(item.name || "Produk").toUpperCase()}*${variantInfo ? ` (${variantInfo})` : ""}\n   ${qty}x @Rp${labelPrice.toLocaleString("id-ID")}${discText} = *Rp${lineTotal.toLocaleString("id-ID")}*`;
  });

  const returnLines = summary.hasReturn
    ? [
        `--------------------------------`,
        `*BARANG DIRETUR:*`,
        ...(trx.returnLog?.items || []).map(
          (item: any, idx: number) =>
            `${idx + 1}. ${(item.name || "Produk").toUpperCase()} (${item.quantity}x) = -Rp${(
              getItemUnitNetPrice(item) * (item.quantity || 1)
            ).toLocaleString("id-ID")}`
        ),
        `*Total Retur:* -Rp${summary.totalRefund.toLocaleString("id-ID")}`,
      ]
    : [];

  const statusText = summary.allReturned
    ? "DIRETUR"
    : summary.hasReturn
    ? `${summary.effectiveStatus} (RETUR SEBAGIAN)`
    : summary.effectiveStatus;

  const lines = [
    `*${storeTitle}*`,
    customStoreAddress ? `${customStoreAddress}${customStorePhone ? ` (Tlp. ${customStorePhone})` : ""}` : "",
    `--------------------------------`,
    `*No. Struk:* ${trx.id}`,
    `*Tanggal:* ${trxDateStr}`,
    `*Kasir:* ${(trx.cashier || cashierName || "-").toUpperCase()}`,
    `*Pelanggan:* ${(trx.customerName || "UMUM").toUpperCase()}`,
    `*Status:* ${statusText}`,
    `--------------------------------`,
    ...itemLines,
    ...returnLines,
    `--------------------------------`,
    `Jumlah Qty: ${totalQty} pcs`,
    `Subtotal Label: Rp${(trx.subtotalLabel || 0).toLocaleString("id-ID")}`,
    (trx.totalDiscount || 0) > 0 ? `Total Potongan: -Rp${trx.totalDiscount.toLocaleString("id-ID")}` : "",
    summary.hasReturn ? `Total Awal: Rp${summary.originalTotal.toLocaleString("id-ID")}` : "",
    `*TOTAL TAGIHAN BERSIH: Rp${summary.netTotal.toLocaleString("id-ID")}*`,
    `Metode Bayar: ${trx.paymentMethod || "-"}`,
    trx.paymentMethod?.includes("CASH") && (trx.cashReceived || 0) > 0
      ? `Dibayar Tunai: Rp${trx.cashReceived.toLocaleString("id-ID")}\nKembalian: Rp${(trx.cashChange || 0).toLocaleString("id-ID")}`
      : "",
    summary.effectiveStatus === "DP"
      ? `Sudah Dibayar: Rp${summary.netPaid.toLocaleString("id-ID")}\n*Sisa Pelunasan: Rp${summary.netRemaining.toLocaleString("id-ID")}*`
      : "",
    `--------------------------------`,
    `Terima kasih telah berbelanja di Nibras House.`,
  ];

  return lines.filter(Boolean).join("\n");
};

