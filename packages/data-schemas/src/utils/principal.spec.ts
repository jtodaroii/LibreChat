import { Types } from 'mongoose';
import { PrincipalType } from 'librechat-data-provider';
import { buildPrincipalFilters } from './principal';

describe('buildPrincipalFilters', () => {
  it('folds every group into one $in branch', () => {
    const userId = new Types.ObjectId();
    const groupIds = Array.from({ length: 300 }, () => new Types.ObjectId());

    const filters = buildPrincipalFilters([
      { principalType: PrincipalType.USER, principalId: userId },
      { principalType: PrincipalType.ROLE, principalId: 'USER' },
      ...groupIds.map((principalId) => ({ principalType: PrincipalType.GROUP, principalId })),
      { principalType: PrincipalType.PUBLIC },
    ]);

    expect(filters).toEqual([
      { principalType: PrincipalType.USER, principalId: userId },
      { principalType: PrincipalType.ROLE, principalId: 'USER' },
      { principalType: PrincipalType.GROUP, principalId: { $in: groupIds } },
      { principalType: PrincipalType.PUBLIC },
    ]);
  });

  it('keeps a lone id of a type as an equality match', () => {
    const groupId = new Types.ObjectId();

    expect(
      buildPrincipalFilters([{ principalType: PrincipalType.GROUP, principalId: groupId }]),
    ).toEqual([{ principalType: PrincipalType.GROUP, principalId: groupId }]);
  });

  it('matches public principals on type alone, once', () => {
    expect(
      buildPrincipalFilters([
        { principalType: PrincipalType.PUBLIC },
        { principalType: PrincipalType.PUBLIC, principalId: 'ignored' },
      ]),
    ).toEqual([{ principalType: PrincipalType.PUBLIC }]);
  });

  it('returns no branches for no principals', () => {
    expect(buildPrincipalFilters([])).toEqual([]);
  });
});
