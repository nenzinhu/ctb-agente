/**
 * Join class names, skipping falsy entries
 * @param classes - Class names or conditions that evaluate to false
 * @returns Space-separated class list
 */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
