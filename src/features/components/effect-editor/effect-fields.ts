import {
  renderNumberField,
  renderTextField,
  renderLabeledCheckbox,
  renderSelectField,
  renderTimeField,
  renderTextareaField,
  renderFormulaField,
  renderRadioFields,
  renderSlider,
} from '@src/components/field/fields';
import {
  enumValues,
  PoolType,
  PoolEffectUsability,
  RechargeType,
  AptitudeType,
} from '@src/data-enums';
import { ActionSubtype } from '@src/features/actions';
import { ArmorType } from '@src/features/active-armor';
import {
  SuccessTestEffect,
  PoolEffect,
  RechargeEffect,
  RechargeStat,
  InitiativeEffect,
  MiscEffect,
  MeleeEffect,
  RangedEffect,
  ArmorEffect,
  HealthEffect,
  HealthRecoveryEffect,
  DurationEffect,
  DurationEffectTarget,
  formatDurationPercentage,
  SkillEffect,
  isFieldSkillEffect,
  Effect,
  MovementEffect,
  MovementEffectMode,
} from '@src/features/effects';
import { Movement } from '@src/features/movement';
import { SkillType, FieldSkillType } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { HealthType, HealthStat, healthLabels } from '@src/health/health';
import { DotOrHotTarget } from '@src/health/recovery';
import type { FieldPropsRenderer, FieldProps } from '@src/utility/field-values';
import { html } from 'lit-html';

const successTest: FieldPropsRenderer<SuccessTestEffect> = ({
  modifier,
  requirement,
  toOpponent,
}) => [
  renderNumberField(modifier),
  renderTextField(requirement),
  renderLabeledCheckbox({
    ...toOpponent,
    label: `${localize('when')} ${localize('target')}`,
  }),
  html`<p class="effect-info">
    ${toOpponent.value
      ? `Applies to tests of anyone targeting you.`
      : 'Applies to your own tests.'}
  </p>`,
];

const pool: FieldPropsRenderer<PoolEffect> = ({
  pool,
  modifier,
  usabilityModification,
}) => [
  renderSelectField(
    pool,
    enumValues(PoolType).filter((p) => p !== PoolType.Threat),
  ),
  renderSelectField(usabilityModification, enumValues(PoolEffectUsability), {
    emptyText: localize('none'),
  }),
  // TODO Check if there is anything that ever lowers amount of pools
  usabilityModification.value !== PoolEffectUsability.Disable
    ? renderNumberField(modifier, { min: 0, max: 5 })
    : '',
];

const recharge: FieldPropsRenderer<RechargeEffect> = ({
  recharge,
  stat,
  modifier,
}) => [
  renderSelectField(recharge, enumValues(RechargeType)),
  renderSelectField(stat, enumValues(RechargeStat)),
  stat.value === RechargeStat.Duration
    ? renderTimeField(modifier)
    : renderNumberField(modifier, { min: -1, max: 1 }),
];

const initiative: FieldPropsRenderer<InitiativeEffect> = ({ modifier }) =>
  renderNumberField(modifier, { min: -20, max: 20 });

const misc: FieldPropsRenderer<MiscEffect> = ({ unique, description }) => [
  // renderSelectField(unique, enumValues(UniqueEffectType), { emptyText: "-" }),
  renderTextareaField(description, { required: true }),
];

const melee: FieldPropsRenderer<MeleeEffect> = ({ dvModifier }) =>
  renderFormulaField(dvModifier, { required: true });

const ranged: FieldPropsRenderer<RangedEffect> = ({
  negativeRangeModifiersMultiplier,
}) => renderNumberField(negativeRangeModifiersMultiplier, { min: 0, max: 5 });

const armor: FieldPropsRenderer<ArmorEffect> = ({
  layerable: layer,
  ...props
}) => [
  enumValues(ArmorType).map((type) =>
    renderNumberField(props[type], { min: 0 }),
  ),
  renderLabeledCheckbox(layer),
];

const health: FieldPropsRenderer<HealthEffect> = ({
  health,
  modifier,
  stat,
}) => [
  renderSelectField(health, enumValues(HealthType)),
  renderSelectField(stat, enumValues(HealthStat), {
    altLabel: (healthStat) => healthLabels(health.value, healthStat),
  }),
  renderNumberField(modifier),
];

const healthRecovery: FieldPropsRenderer<HealthRecoveryEffect> = ({
  amount,
  interval,
  stat,
  technologicallyAided,
}) => [
  renderFormulaField(amount),
  renderRadioFields(stat, enumValues(DotOrHotTarget)),
  renderTimeField(interval),
  renderLabeledCheckbox(technologicallyAided),
  html`
    <p class="effect-info">
      ${technologicallyAided.value
        ? `Augments natural Biomorph healing. `
        : `Replaces natural biomorph healing.`}
    </p>
  `,
];

const duration: FieldPropsRenderer<DurationEffect> = ({
  subtype,
  modifier,
  taskType,
  halve,
}) => {
  const canHalve = [
    DurationEffectTarget.Drugs,
    DurationEffectTarget.HealingTimeframes,
  ].includes(subtype.value);
  return [
    renderSelectField(subtype, enumValues(DurationEffectTarget)),
    subtype.value === DurationEffectTarget.TaskActionTimeframe
      ? renderSelectField(taskType, enumValues(ActionSubtype), {
          emptyText: localize('all'),
        })
      : '',
    canHalve ? renderLabeledCheckbox(halve) : '',
    canHalve && halve.value
      ? ''
      : html`
          <div class="duration-slider-field">
            <span>${formatDurationPercentage(modifier.value)}</span>
            ${renderSlider(modifier, {
              min: -200,
              max: 200,
              step: 25,
              markers: true,
            })}
          </div>
        `,
  ];
};

const skill: FieldPropsRenderer<SkillEffect> = ({
  field,
  specialization,
  skillType,
  linkedAptitude: aptitude,
  aptitudeMultiplier,
  total,
}) => [
  renderSelectField(skillType, [
    ...enumValues(SkillType),
    ...enumValues(FieldSkillType),
  ]),
  isFieldSkillEffect(skillType.value) ? renderTextField(field) : '',
  renderTextField(specialization),
  renderNumberField(total, { min: 0, max: 99 }),
  total.value === 0
    ? [
        renderNumberField(aptitudeMultiplier, { min: 0, max: 3 }),
        renderSelectField(aptitude, enumValues(AptitudeType)),
      ]
    : '',
];

const movement: FieldPropsRenderer<MovementEffect> = ({
  movementType,
  base,
  full,
  mode,
}) => [
  renderRadioFields(mode, enumValues(MovementEffectMode)),
  renderSelectField(movementType, enumValues(Movement)),
  renderNumberField(base),
  renderNumberField(full),
];

const effectFieldFunctions = {
  successTest,
  pool,
  initiative,
  misc,
  health,
  healthRecovery,
  armor,
  recharge,
  duration,
  melee,
  ranged,
  skill,
  movement,
};

export const effectFields = (effect: FieldProps<Effect>) => {
  return (effectFieldFunctions[
    effect.type.value
  ] as FieldPropsRenderer<Effect>)(effect);
};
