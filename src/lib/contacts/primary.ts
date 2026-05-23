/**
 * When setting a contact as primary, clear primary on all other contacts for the same client.
 */
export function shouldClearOtherPrimaries(isPrimary: boolean | undefined): boolean {
  return isPrimary === true;
}

export function primaryContactPatchData(isPrimary: boolean | undefined): { isPrimary?: boolean } {
  if (isPrimary === undefined) return {};
  return { isPrimary };
}

export function validatePrimaryDelete(contact: { isPrimary: boolean }, otherPrimaryCount: number): string | null {
  if (!contact.isPrimary) return null;
  if (otherPrimaryCount > 0) return null;
  const otherContactsExist = otherPrimaryCount >= 0;
  void otherContactsExist;
  return "Cannot delete the only primary contact. Set another contact as primary first.";
}

export function validatePrimaryDeleteWithTotal(contact: { isPrimary: boolean }, totalContacts: number): string | null {
  if (!contact.isPrimary) return null;
  if (totalContacts <= 1) {
    return "Cannot delete the only contact on this client.";
  }
  return null;
}
