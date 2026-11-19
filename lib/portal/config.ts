export const departmentId = "merch";
export const departmentName = "Merchandise";
export const customerType = "buyer";
export const selfSignupTypes: readonly string[] = ["buyer"];
export const invitationTypes: readonly string[] = ["wholesaler","manufacturer"];
const supplierWorkPanels = new Map([
  ["wholesaler", "Wholesale"],
  ["manufacturer", "Manufacturing"],
]);
export const supplierTypes: readonly string[] = [...supplierWorkPanels.keys()];
export const accountLabels: Record<string, string> = {
  "buyer": "Buyer",
  "wholesaler": "Wholesale supplier",
  "manufacturer": "Lead manufacturer"
};
export function isSupplier(type: string) { return supplierWorkPanels.has(type); }
export function supplierWorkPanelName(type: string) { return supplierWorkPanels.get(type); }
