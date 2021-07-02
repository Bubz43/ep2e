import {
  renderFormulaField,
  renderLabeledCheckbox,
  renderNumberField,
  renderRadioFields,
  renderSelectField,
  renderSlider,
  renderTextareaField,
  renderTextField,
  renderTimeField,
} from '@src/components/field/fields';
import {
  AptitudeType,
  enumValues,
  PoolEffectUsability,
  PoolType,
  RechargeType,
} from '@src/data-enums';
import { ActionSubtype } from '@src/features/actions';
import { ArmorType } from '@src/features/active-armor';
import {
  ArmorEffect,
  DurationEffect,
  DurationEffectTarget,
  Effect,
  formatDurationPercentage,
  HealthEffect,
  HealthRecoveryEffect,
  InitiativeEffect,
  isFieldSkillEffect,
  MeleeEffect,
  MiscEffect,
  MovementEffect,
  MovementEffectMode,
  PoolEffect,
  RangedEffect,
  RechargeEffect,
  RechargeStat,
  SkillEffect,
  SuccessTestEffect,
  UniqueEffectType,
} from '@src/features/effects';
import { Movement } from '@src/features/movement';
import {
  ActiveSkillCategory,
  CommonPilotField,
  fieldSkillInfo,
  FieldSkillType,
  KnowSkillCategory,
  skillInfo,
  SkillType,
} from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { healthLabels, HealthStat, HealthType } from '@src/health/health';
import { HealOverTimeTarget } from '@src/health/recovery';
import type { FieldProps, FieldPropsRenderer } from '@src/utility/field-values';
import { html } from 'lit-html';

type WithAllProps<T> = FieldPropsRenderer<Required<T>>;

const successTest: WithAllProps<SuccessTestEffect> = ({
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

const pool: WithAllProps<PoolEffect> = ({
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

const recharge: WithAllProps<RechargeEffect> = ({
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

const initiative: WithAllProps<InitiativeEffect> = ({ modifier }) =>
  renderNumberField(modifier, { min: -20, max: 20 });

const misc: WithAllProps<MiscEffect> = ({ unique, description }) => [
  renderSelectField(unique, enumValues(UniqueEffectType), { emptyText: '-' }),
  renderTextareaField(description, { required: true }),
];

const melee: WithAllProps<MeleeEffect> = ({ dvModifier }) => [
  renderFormulaField(dvModifier, { required: true }),
];

const ranged: WithAllProps<RangedEffect> = ({
  negativeRangeModifiersMultiplier,
}) => renderNumberField(negativeRangeModifiersMultiplier, { min: 0, max: 5 });

const armor: WithAllProps<ArmorEffect> = ({
  layerable,
  concealable,
  ...props
}) => [
  enumValues(ArmorType).map((type) =>
    renderNumberField(props[type], { min: 0 }),
  ),
  renderLabeledCheckbox(layerable),
  renderLabeledCheckbox(concealable),
];

const health: WithAllProps<HealthEffect> = ({ health, modifier, stat }) => [
  renderSelectField(health, enumValues(HealthType)),
  renderSelectField(stat, enumValues(HealthStat), {
    altLabel: (healthStat) => healthLabels(health.value, healthStat),
  }),
  renderNumberField(modifier),
];

const healthRecovery: WithAllProps<HealthRecoveryEffect> = ({
  damageAmount,
  woundAmount,
  interval,
  stat,
  technologicallyAided,
}) => [
  renderRadioFields(stat, enumValues(HealOverTimeTarget)),
  stat.value === HealOverTimeTarget.Damage
    ? renderFormulaField(damageAmount)
    : renderNumberField(woundAmount, { min: 1 }),

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

const duration: WithAllProps<DurationEffect> = ({
  subtype,
  modifier,
  taskType,
  cummulative,
}) => {
  return [
    renderSelectField(subtype, enumValues(DurationEffectTarget)),
    subtype.value === DurationEffectTarget.TaskActionTimeframe
      ? renderSelectField(taskType, enumValues(ActionSubtype), {
          emptyText: localize('all'),
        })
      : '',
    html`
      <div class="duration-slider-field">
        <span>${formatDurationPercentage(modifier.value)}</span>
        ${renderSlider(modifier, {
          min: -100,
          max: 300,
          step: 25,
          markers: true,
        })}
      </div>
    `,
    renderLabeledCheckbox(cummulative),
  ];
};

const skill: WithAllProps<SkillEffect> = ({
  field,
  specialization,
  skillType,
  linkedAptitude: aptitude,
  aptitudeMultiplier,
  total,
  points,
  category,
}) => [
  renderSelectField(skillType, [
    ...enumValues(SkillType),
    ...enumValues(FieldSkillType),
  ]),
  isFieldSkillEffect(skillType.value) ? renderTextField(field) : '',
  renderTextField(specialization),
  renderSelectField(
    {
      ...category,
      value:
        category.value ||
        (isFieldSkillEffect(skillType.value)
          ? fieldSkillInfo[skillType.value].categories[0] ||
            (skillType.value === FieldSkillType.Know
              ? KnowSkillCategory.Academics
              : ActiveSkillCategory.Misc)
          : skillInfo[skillType.value].category),
    },
    [...enumValues(ActiveSkillCategory), ...enumValues(KnowSkillCategory)],
  ),
  renderNumberField(points, { min: 0, max: 99 }),
  total.value && !points.value
    ? renderNumberField(total, {
        helpText: `${localize('set')} ${localize('points')}`,
        helpPersistent: true,
        max: total.value,
      })
    : '',
  renderSelectField(aptitude, enumValues(AptitudeType)),
  renderNumberField(aptitudeMultiplier, { min: 0, max: 2 }),
];

const movement: WithAllProps<MovementEffect> = ({
  movementType,
  base,
  full,
  mode,
  skill,
}) => [
  renderRadioFields(mode, enumValues(MovementEffectMode)),
  renderSelectField(movementType, enumValues(Movement)),
  renderNumberField(base),
  renderNumberField(full),
  mode.value === MovementEffectMode.Grant
    ? renderSelectField(
        {
          ...skill,
          label: `${localize('override')} ${localize('default')} ${localize(
            'skill',
          )}`,
        },
        [...enumValues(SkillType), ...enumValues(CommonPilotField)],
        {
          emptyText: '-',
          altLabel: (type) =>
            enumValues(CommonPilotField).includes(type as CommonPilotField)
              ? `${localize('pilot')}: ${localize(type)}`
              : localize(type),
        },
      )
    : '',
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

export const effectFields = (effect: FieldProps<Required<Effect>>) => {
  return (effectFieldFunctions[effect.type.value] as WithAllProps<Effect>)(
    effect,
  );
};
