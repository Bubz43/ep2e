import { enumValues, PsiPush, PsiRange } from '@src/data-enums';
import type { Sleight } from '@src/entities/item/proxies/sleight';
import { ActionSubtype, createAction } from '@src/features/actions';
import { localize } from '@src/foundry/localization';
import { distanceBetweenTokens } from '@src/foundry/token-helpers';
import { notEmpty } from '@src/utility/helpers';
import type { WithUpdate } from '@src/utility/updating';
import { compact, concat, difference, merge, pipe, take, uniq } from 'remeda';
import type { SetRequired } from 'type-fest';
import { psiRangeThresholds } from './range-modifiers';
import { SkillTest, SkillTestInit } from './skill-test';
import { createSuccessTestModifier } from './success-test';

export type PsiTestInit = SetRequired<SkillTestInit, 'character'> & {
  sleight: Sleight;
};

export class PsiTest extends SkillTest {
  readonly character;

  readonly use: WithUpdate<{
    sleight: Sleight;
    push: '' | PsiPush;
    attackTargets: Set<Token>;
    targetDistance: number;
    targetingAsync: boolean;
    maxTargets: number;
    targetingSelf: boolean;
    range: PsiRange;
    touch: boolean;
  }>;

  readonly rangeModifier = createSuccessTestModifier({
    name: localize(PsiRange.Close),
    value: 0,
  });

  constructor({ sleight, ...init }: PsiTestInit) {
    super({
      ...init,
      action:
        init.action ??
        createAction({
          type: sleight.action,
          subtype: ActionSubtype.Mental,
        }),
    });
    this.character = init.character;
    const freePush = this.psi?.freePush;
    const maxTargets = freePush === PsiPush.ExtraTarget ? 2 : 1;
    const attackTargets = new Set(take([...game.user.targets], maxTargets));
    const { token } = this;
    const targettingSelf = !!token && attackTargets.has(token);
    const targetDistance =
      token && notEmpty(attackTargets)
        ? Math.max(
            ...[...attackTargets].map((target) =>
              distanceBetweenTokens(token, target),
            ),
          )
        : 10;

    this.use = {
      sleight,
      push: '',
      maxTargets,
      attackTargets,
      targetingSelf: targettingSelf,
      targetDistance,
      touch: false,
      range: PsiRange.Close,
      targetingAsync: false,
      update: this.recipe((draft, changed) => {
        draft.use = merge(draft.use, changed);
        const { use } = draft;
        if (changed.sleight) {
          this.updateAction(draft, { type: use.sleight.action });
          if (
            use.sleight.isTemporary &&
            use.push === PsiPush.IncreasedDuration
          ) {
            use.push = '';
          }
        }
      }),
    };

    const thresholds = psiRangeThresholds(
      freePush === PsiPush.IncreasedRange ? 1 : 0,
    );
    if (this.use.targetDistance <= thresholds.pointBlank) {
      this.rangeModifier.name = localize(PsiRange.PointBlank);
      this.rangeModifier.value = 10;
    } else if (this.use.targetDistance > thresholds.close) {
      const instances = Math.ceil(
        (this.use.targetDistance - thresholds.close) / 2,
      );
      this.rangeModifier.name = `${localize('beyondRange')} x${instances}`;
      this.rangeModifier.value = instances * -10;
    }

    this.modifiers.simple.set(this.rangeModifier.id, this.rangeModifier);
  }

  get psi() {
    return this.character.psi;
  }

  get freePush() {
    return this.psi?.freePush;
  }

  get availablePushes() {
    return pipe(
      enumValues(PsiPush),
      difference(compact([this.character.psi?.freePush])),
      concat([PsiPush.ExtraTarget]),
      uniq(),
    );
  }
}
