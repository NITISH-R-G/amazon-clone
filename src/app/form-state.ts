/** Shared by server actions and the client forms that use them. */
export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Non-sensitive submitted values, so the form can be re-filled after an error. Never card data. */
  values?: Record<string, string>;
};
