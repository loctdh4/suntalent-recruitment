/** Vai trò được phép quản lý đối tác/khách hàng. */
export const CLIENT_MANAGER_ROLES = [
  "sales",
  "sales_intern",
  "admin",
] as const;

/** Loại đối tác. */
export const CLIENT_TYPE_OPTIONS = [
  { value: "business", label: "Doanh nghiệp" },
  { value: "individual", label: "Cá nhân" },
] as const;

export const CLIENT_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  CLIENT_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);
