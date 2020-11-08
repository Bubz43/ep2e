import { renderSelectField, renderTextField } from "@src/components/field/fields";
import { enumValues, AptitudeType } from "@src/data-enums";
import { ActionType, ActionSubtype } from "@src/features/actions";
import { RepNetwork } from "@src/features/reputations";
import { SkillType, FieldSkillType, ActiveSkillCategory, KnowSkillCategory } from "@src/features/skills";
import { ActionTag, ChecksTag, SkillTag, FieldSkillTag, SkillCategoryTag, RepTag, SpecialTag, SpecialTest, Tag } from "@src/features/tags";
import { localize } from "@src/foundry/localization";
import type { FieldPropsRenderer, FieldProps } from "@src/utility/field-values";
import { noop } from "remeda";

const action: FieldPropsRenderer<ActionTag> = ({ subtype, action }) => [
  renderSelectField(action, enumValues(ActionType), { emptyText: localize("all")}),
  renderSelectField(subtype, enumValues(ActionSubtype), { emptyText: localize("all")})
]

const aptitudeCheck: FieldPropsRenderer<ChecksTag> = ({ aptitude }) =>
  renderSelectField(aptitude, enumValues(AptitudeType));
const linkedAptitude: FieldPropsRenderer<ChecksTag> = ({ aptitude }) =>
  renderSelectField(aptitude, enumValues(AptitudeType));

const skill: FieldPropsRenderer<SkillTag> = ({ skillType }) =>
  renderSelectField(skillType, enumValues(SkillType));
const fieldSkill: FieldPropsRenderer<FieldSkillTag> = ({
  fieldSkill,
  field,
}) => [
  renderSelectField(fieldSkill, enumValues(FieldSkillType)),
  renderTextField(field),
];

const skillCategory: FieldPropsRenderer<SkillCategoryTag> = ({ category }) =>
  renderSelectField(category, [
    ...enumValues(ActiveSkillCategory),
    ...enumValues(KnowSkillCategory),
  ]);
const rep: FieldPropsRenderer<RepTag> = ({ network }) =>
  renderSelectField(network, enumValues(RepNetwork));

const special: FieldPropsRenderer<SpecialTag> = ({ test }) =>
  renderSelectField(test, enumValues(SpecialTest));

const tagPropRenderers = {
  action,
  aptitudeCheck,
  linkedAptitude,
  skill,
  fieldSkill,
  skillCategory,
  rep,
  special,
  allActions: noop
} as const;


export const tagFields = (tag: FieldProps<Tag>) => {
  return (tagPropRenderers[tag.type.value] as FieldPropsRenderer<Tag>)(
    tag
  );
};
