import { Types } from 'mongoose';
import { PrincipalType } from 'librechat-data-provider';

/**
 * Normalizes a principalId to the correct type for MongoDB queries and storage.
 * USER and GROUP principals are stored as ObjectIds; ROLE principals are strings.
 * Ensures a string caller ID is cast to ObjectId so it matches documents written
 * by `grantCapability` — which always stores user/group IDs as ObjectIds to match
 * what `getUserPrincipals` returns.
 */
export const normalizePrincipalId = (
  principalId: string | Types.ObjectId,
  principalType: PrincipalType,
): string | Types.ObjectId => {
  if (typeof principalId === 'string' && principalType !== PrincipalType.ROLE) {
    if (!Types.ObjectId.isValid(principalId)) {
      throw new TypeError(`Invalid ObjectId string for ${principalType}: "${principalId}"`);
    }
    return new Types.ObjectId(principalId);
  }
  return principalId;
};

type PrincipalId = string | Types.ObjectId;

interface PrincipalRef {
  principalType: string;
  principalId?: PrincipalId;
}

interface PrincipalFilter {
  principalType: string;
  principalId?: PrincipalId | { $in: PrincipalId[] };
}

/**
 * Builds the `$or` branches that match any of `principals`: one branch per principal type, with
 * that type's ids in a single `$in`. Public principals match on type alone, and a principal
 * without an id keeps its own branch.
 */
export const buildPrincipalFilters = (principals: readonly PrincipalRef[]): PrincipalFilter[] => {
  const filters: PrincipalFilter[] = [];
  const idsByType = new Map<string, PrincipalId[]>();
  let hasPublic = false;
  for (const { principalType, principalId } of principals) {
    if (principalType === PrincipalType.PUBLIC) {
      hasPublic = true;
      continue;
    }
    if (principalId == null) {
      filters.push({ principalType, principalId });
      continue;
    }
    const ids = idsByType.get(principalType);
    if (ids) {
      ids.push(principalId);
    } else {
      idsByType.set(principalType, [principalId]);
    }
  }
  for (const [principalType, ids] of idsByType) {
    filters.push({ principalType, principalId: ids.length === 1 ? ids[0] : { $in: ids } });
  }
  if (hasPublic) {
    filters.push({ principalType: PrincipalType.PUBLIC });
  }
  return filters;
};
