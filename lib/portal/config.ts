export const departmentId = "merch";
export const departmentName = "Merchandise";
export const customerType = "buyer";
export const selfSignupTypes: readonly string[] = ["buyer"];
export const invitationTypes: readonly string[] = ["wholesaler","manufacturer"];
export const supplierTypes: readonly string[] = ["wholesaler","manufacturer"];
export const accountLabels: Record<string, string> = {
  "buyer": "Buyer",
  "wholesaler": "Wholesale supplier",
  "manufacturer": "Lead manufacturer"
};
export function isSupplier(type: string) { return supplierTypes.includes(type); }
