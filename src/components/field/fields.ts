import { localize, LangEntry } from '../../../src/foundry/localization';
import { html, nothing, TemplateResult } from 'lit-html';
import { live } from 'lit-html/directives/live';
import { ifDefined } from 'lit-html/directives/if-defined';
import { notEmpty } from '../../../src/utility/helpers';
import type { Field } from './field';
import type { ValuedProp } from '../../../src/utility/field-values';
import type { Checkbox } from '@material/mwc-checkbox';
import type { Switch } from '@material/mwc-switch';
import type { Radio } from '@material/mwc-radio';
import { DatepickerValueUpdated } from 'app-datepicker/dist/custom_typings';
import { tooltip } from '@src/init';
import { noop } from 'remeda';

export type FieldElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement
  | Checkbox
  | Switch
  | Radio;

export const renderListToOptions = <T extends ReadonlyArray<string>>({
  list,
  selected,
  emptyText,
  altLabel,
  disableOptions,
}: {
  list: T;
  selected: T[number] | '';
  emptyText?: string;
  altLabel?: (option: T[number]) => string;
  disableOptions?: T;
}) => {
  const options = [];

  if (typeof emptyText === 'string') {
    options.push(html`
      <option value="" .selected=${live(selected === '')}>
        ${emptyText === '' ? nothing : emptyText}
      </option>
    `);
  } else if (notEmpty(list) === false) {
    throw new Error(`Select ${list} must have selection, but has no options.`);
  }

  const labelFn = altLabel || localize;

  for (const value of list) {
    options.push(html`
      <option
        value="${value}"
        .selected=${live(value === selected)}
        ?disabled=${disableOptions?.includes(value)}
      >
        ${labelFn(value)}
      </option>
    `);
  }
  return options;
};

type FieldSlots = Partial<{ before: TemplateResult; after: TemplateResult }>;
type FieldOptions = Partial<
  Pick<Field, 'helpText' | 'helpPersistent' | 'validationMessage' | 'dirty'>
> &
  FieldSlots;

type CommonOptions = Partial<{
  disabled: boolean;
  required: boolean;
}> &
  FieldOptions;

const slotNames = ['before', 'after'] as const;

const fieldSlots = <T extends FieldSlots>(possibleSlots: T) => {
  return slotNames.map((slot) => fieldSlot(slot, possibleSlots[slot]));
};

const fieldSlot = (slot: 'before' | 'after', content: unknown) => {
  return content ? html` <span slot=${slot}>${content}</span> ` : nothing;
};

const field = ({
  label,
  content,
  helpPersistent = false,
  helpText,
  validationMessage,
  dirty = false,
  ...slots
}: FieldOptions & { label: string; content: TemplateResult }) => {
  return html`
    <sl-field
      ?dirty=${live(dirty)}
      label=${label}
      helpText=${ifDefined(helpText)}
      validationMessage=${ifDefined(validationMessage)}
      ?helpPersistent=${helpPersistent}
    >
      ${content} ${fieldSlots(slots)}
    </sl-field>
  `;
};

export const renderSelectField = <T extends ReadonlyArray<LangEntry | string>>(
  { prop, label, value }: ValuedProp<T[number] | ''>,
  list: T,
  {
    emptyText,
    disabled = false,
    required = false,
    altLabel,
    disableOptions,
    ...fieldOptions
  }: CommonOptions & {
    emptyText?: string;
    altLabel?: (options: T[number]) => string;
    disableOptions?: T;
  } = {},
) => {
  const confirmedVal = emptyText === undefined && !value ? list[0] : value;
  // const labelFn = altLabel || localize;
  // const altField = html`
  //   <mwc-select
  //     id=${prop}
  //     name=${prop}
  //     label=${label}
  //     ?disabled=${disabled}
  //     ?required=${required}
  //   >
  //     ${typeof emptyText === "string"
  //       ? html` <mwc-list-item value=""></mwc-list-item> `
  //       : ""}
  //     ${list.map(
  //       (item) => html`
  //         <mwc-list-item value=${item} ?selected=${item === value}
  //           >${labelFn(item)}</mwc-list-item
  //         >
  //       `
  //     )}
  //   </mwc-select>
  // `;
  // return altField;
  return field({
    label,
    ...fieldOptions,
    content: html`
      <select name=${prop} ?disabled=${disabled} ?required=${required}>
        ${renderListToOptions({
          list,
          selected: confirmedVal,
          emptyText,
          altLabel,
          disableOptions,
        })}
      </select>
    `,
  });
};

type RadioProps = {
  checked: boolean;
  name: string;
  value: string;
  disabled: boolean;
};

const clickOnEnter = (ev: KeyboardEvent) => {
  if (ev.key === 'Enter') {
    ev.stopPropagation();
    (ev.currentTarget as HTMLElement).click();
  }
};

export const renderRadio = ({
  checked,
  name,
  value,
  disabled,
}: RadioProps) => html`
  <mwc-radio
    ?checked=${live(checked)}
    name=${name}
    value=${value}
    ?disabled=${disabled}
    @keydown=${clickOnEnter}
    style="margin-right: -.4rem"
    ;
  ></mwc-radio>
`;

// TODO arrow keys to move between radios
export const renderRadioFields = <T extends ReadonlyArray<LangEntry>>(
  { label, value, prop }: ValuedProp<T[number]>,
  list: T,
  {
    disabled = false,
    altLabel = localize,
  }: { disabled?: boolean; altLabel?: (val: T[number]) => string } = {},
) => {
  return html`
    <div
      style="display: flex; justify-content: space-around"
      class="radio-fields"
    >
      ${list.map(
        (option) => html`
          <mwc-formfield label=${altLabel(option)} style="height: 40px">
            ${renderRadio({
              checked: value === option,
              name: prop,
              value: option,
              disabled,
            })}
          </mwc-formfield>
        `,
      )}
    </div>
  `;
};

type CheckboxOptions = Partial<{
  disabled: boolean;
  indeterminate: boolean;
  alignEnd: boolean;
  tooltipText: string;
}>;

export const renderCheckbox = (
  { value, prop }: ValuedProp<boolean>,
  {
    disabled = false,
    indeterminate = false,
  }: Omit<CheckboxOptions, 'alignEnd'> = {},
) => html`
  <mwc-checkbox
    id=${prop}
    name=${prop}
    ?checked=${live(!indeterminate && value)}
    ?disabled=${disabled}
    ?indeterminate=${live(indeterminate)}
    @keydown=${clickOnEnter}
  ></mwc-checkbox>
`;

export const renderLabeledCheckbox = (
  props: ValuedProp<boolean>,
  { alignEnd = false, tooltipText, ...options }: CheckboxOptions = {},
) => html`
  <mwc-formfield
    label=${props.label}
    ?alignEnd=${alignEnd}
    style="height: 40px; padding-right: 0.5rem; white-space: nowrap;"
    data-tooltip=${ifDefined(tooltipText)}
    @mouseover=${tooltipText ? tooltip.fromData : noop}
  >
    ${renderCheckbox(props, options)}
  </mwc-formfield>
`;

export const renderSwitch = (
  { value, label, prop }: ValuedProp<boolean>,
  {
    disabled = false,
  }: Omit<CheckboxOptions, 'indeterminate' | 'alignEnd'> = {},
) => html`
  <mwc-switch
    style="margin: 0.7rem 1rem"
    title=${label}
    id=${prop}
    name=${prop}
    ?checked=${live(value)}
    ?disabled=${disabled}
    @keydown=${clickOnEnter}
  ></mwc-switch>
`;

export const renderLabeledSwitch = (
  { value, label, prop }: ValuedProp<boolean>,
  {
    disabled = false,
    alignEnd = false,
  }: Omit<CheckboxOptions, 'indeterminate'> = {},
) => html`
  <mwc-formfield label=${label} ?alignEnd=${alignEnd}>
    ${renderSwitch({ value, label, prop }, { disabled })}
  </mwc-formfield>
`;

export type NumberOptions = Partial<{
  min: number;
  max: number;
  step: number;
}>;

type NumberFieldOptions = Omit<CommonOptions, 'after'> & NumberOptions;

export const renderSlider = (
  { prop, value }: Omit<ValuedProp<number>, 'label'>,
  {
    max,
    min,
    step,
    disabled = false,
    markers = false,
    pin = false,
  }: NumberOptions &
    Partial<{ disabled: boolean; markers: boolean; pin: boolean }> = {},
) => html`
  <mwc-slider
    value=${live(value)}
    .value=${live(value)}
    name=${prop}
    id=${prop}
    ?disabled=${disabled}
    ?markers=${markers}
    ?pin=${pin}
    min=${ifDefined(min)}
    max=${ifDefined(max)}
    step=${ifDefined(step)}
  ></mwc-slider>
`;

export const renderNumberInput = (
  { prop, value }: Omit<ValuedProp<number>, 'label'>,
  {
    max,
    min,
    step,
    disabled = false,
    required = false,
  }: NumberOptions & Partial<{ disabled: boolean; required: boolean }> = {},
) => html` <input
  type="number"
  name=${prop}
  value=${live(value)}
  .value=${live(value)}
  min=${ifDefined(min)}
  max=${ifDefined(max)}
  step=${ifDefined(step)}
  ?disabled=${disabled}
  ?required=${required}
/>`;

export const renderNumberField = (
  { value, label, prop }: ValuedProp<number>,
  {
    min,
    max,
    step,
    disabled,
    required,
    ...fieldOptions
  }: NumberFieldOptions = {},
) => {
  // const mwcTextField = html`
  //   <mwc-textfield
  //     type="number"
  //     name=${prop}
  //     .value=${live(value)}
  //     label=${label}
  //     ?disabled=${disabled}
  //     min=${ifDefined(min)}
  //     max=${ifDefined(max)}
  //     step=${ifDefined(step)}
  //     ?required=${required}
  //     ?helperPersistent=${!!fieldOptions.helpPersistent}
  //     helper=${ifDefined(fieldOptions.helpText)}
  //   >
  //   </mwc-textfield>
  // `;
  // return mwcTextField;
  return field({
    label,
    ...fieldOptions,
    content: renderNumberInput(
      { value, prop },
      { min, max, step, disabled, required },
    ),
  });
};

type TimeFieldOptions = Partial<{
  disabled: boolean;
  min: number;
  max: number;
  permanentLabel?: string;
  whenZero?: string;
}>;

export const renderTimeField = (
  { value, label, prop }: ValuedProp<number>,
  {
    disabled = false,
    min,
    max,
    permanentLabel,
    whenZero,
  }: TimeFieldOptions = {},
) => {
  return html`
    <time-field
      value=${live(value)}
      .value=${live(value)}
      label=${label}
      min=${min}
      max=${max}
      ?disabled=${disabled}
      permanentLabel=${ifDefined(permanentLabel)}
      whenZero=${ifDefined(whenZero)}
    >
      <input type="number" name=${prop} />
    </time-field>
  `;
};

type TextFieldOptions = CommonOptions & {
  listId?: string;
  search?: boolean;
  placeholder?: string;
  maxLength?: number;
};

const clearSearchOnEscape = (ev: KeyboardEvent) => {
  const input = ev.currentTarget as HTMLInputElement;
  if (ev.key === 'Escape' && input.type === 'search') {
    input.value = '';
    input.dispatchEvent(
      new CustomEvent('change', { bubbles: true, composed: true }),
    );
  }
};

type DateInputOptions = Partial<{
  disabled: boolean;
  required: boolean;
  min: string;
  max: string;
}>;

export const renderDateField = (
  { value, label, prop }: ValuedProp<string>,
  { min, max, disabled = false, required = false }: DateInputOptions = {},
) => {
  return html`
    <sl-date-field
      value=${live(value)}
      label=${label}
      min=${ifDefined(min)}
      max=${ifDefined(max)}
      ?disabled=${disabled}
      ?required=${required}
    >
      <input type="date" name=${prop} hidden />
    </sl-date-field>
  `;
};

export const renderTextInput = (
  { value, prop }: ValuedProp<string>,
  {
    disabled = false,
    required = false,
    listId,
    search,
    placeholder,
    maxLength,
  }: TextFieldOptions = {},
) => {
  return html`
    <input
      type=${search ? 'search' : 'text'}
      name=${prop}
      @keydown=${clearSearchOnEscape}
      value=${live(value)}
      .value=${live(value)}
      placeholder=${ifDefined(placeholder)}
      ?disabled=${disabled}
      ?required=${required}
      maxlength=${ifDefined(maxLength)}
      list=${ifDefined(listId)}
    />
  `;
};

export const renderTextField = (
  props: ValuedProp<string>,
  options: TextFieldOptions = {},
) => {
  // const mwcTextField = html`
  //   <mwc-textfield
  //     name=${props.prop}
  //     .value=${live(props.value)}
  //     label=${props.label}
  //     ?disabled=${!!options.disabled}
  //     placeholder=${ifDefined(options.placeholder)}
  //     ?required=${!!options.required}
  //     maxLength=${ifDefined(options.maxLength)}
  //     helper=${ifDefined(options.helpText)}
  //     type=${options.search ? "search" : "text"}
  //   >
  //   </mwc-textfield>
  // `;
  // return mwcTextField;
  return field({
    label: props.label,
    ...options,
    content: renderTextInput(props, options),
  });
};

type FormulaFieldOptions = TextFieldOptions &
  Partial<{
    showAverage: boolean;
  }>;

export const renderFormulaField = (
  { value, label, prop }: ValuedProp<string>,
  {
    disabled = false,
    required = false,
    listId,
    after,
    placeholder,
    showAverage = true,
    ...fieldOptions
  }: FormulaFieldOptions = {},
) => {
  // const mwcTextField = html`
  //   <mwc-textfield
  //     name=${prop}
  //     .value=${live(value)}
  //     label=${showAverage ? `${label} [${averageRoll(value)}]` : label}
  //     ?disabled=${disabled}
  //     placeholder=${ifDefined(placeholder)}
  //     ?required=${required}
  //     helper=${ifDefined(fieldOptions.helpText)}
  //     icon="casino"
  //     data-valid-formula=${value}
  //     data-validate-formula="true"
  //   >
  //   </mwc-textfield>
  // `;
  // return mwcTextField;
  return field({
    // label: showAverage && value ? `${label} [${averageRoll(value)}]` : label,
    label,
    ...fieldOptions,
    after,
    before: html` <mwc-icon>casino</mwc-icon> `,
    content: html`
      <input
        type="text"
        name=${prop}
        value=${live(value)}
        .value=${live(value)}
        ?disabled=${disabled}
        ?required=${required}
        list=${ifDefined(listId)}
        data-valid-formula=${value}
        data-validate-formula="true"
      />
    `,
  });
};

type TextareaFieldOptions = Omit<CommonOptions, 'after' | 'before'> &
  Partial<{
    rows: number;
    resizable?: boolean;
  }>;

export const renderTextareaField = (
  { label, value, prop }: ValuedProp<string>,
  {
    disabled = false,
    required = false,
    rows = 2,
    resizable = false,
    ...fieldOptions
  }: TextareaFieldOptions = {},
) => {
  //   const mwcTextField = html`
  //    <mwc-textarea
  //       name=${prop}
  //       .value=${live(value)}
  //       label=${label}
  //       ?disabled=${disabled}
  //       ?required=${required}
  //       helper=${ifDefined(fieldOptions.helpText)}
  //     >
  //     </mwc-textarea>
  // `;
  // return mwcTextField;
  return field({
    label,
    ...fieldOptions,
    content: html`
      <textarea
        ?data-resizable=${resizable}
        name=${prop}
        .value=${live(value)}
        ?disabled=${disabled}
        ?required=${required}
        rows=${rows}
      ></textarea>
    `,
  });
};

export const emptyTextDash = { emptyText: '-' } as const;
