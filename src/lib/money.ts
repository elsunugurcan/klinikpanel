export const fmtMoney = (kurus: number) => (kurus / 100).toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
export const fmtMoneyFull = (kurus: number) => (kurus / 100).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
