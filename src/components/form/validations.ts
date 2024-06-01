// import { notify, NotificationType } from "src/foundry/foundry-apps";

import { rollFormula, cleanFormula } from '@src/foundry/rolls';
import type { FieldValue } from '@src/utility/field-values';
import type { FieldElement } from '../field/fields';

const badNumbervalues = [NaN, null, undefined] as const;

const isInvalidNumber = (value: unknown) =>
  badNumbervalues.some((bad) => Object.is(bad, value));

const validateNumberInput = (input: HTMLInputElement) => {
  let value = Number(input.value);
  if (isInvalidNumber(value)) value = 0;
  if (input.hasAttribute('min')) value = Math.max(value, Number(input.min));
  if (input.hasAttribute('max')) value = Math.min(value, Number(input.max));
  if (input.hasAttribute('step')) {
    const decimals = String(input.step).split('.')[1];
    if (decimals) value = Number(value.toFixed(decimals.length));
    else value -= value % Number(input.step);
  } else value = Math.round(value);
  if (input.value !== '') input.value = String(value);
  return value;
};

const validateFormulaInput = async (input: HTMLInputElement) => {
  const { value } = input;
  if (value) {
    const { total } = await rollFormula(value) ?? {};

    if (isInvalidNumber(total)) {
      // notify(
      //   NotificationType.Error,
      //   `${localize(
      //     "DESCRIPTIONS",
      //     "invalidRollFormula"
      //   )}: <code class="formula">${value.trim()}</code> `
      // );

      const { validFormula } = input.dataset;
      input.value = validFormula || '';
    } else input.value = cleanFormula(value);
  }
  return input.value;
};

export const validateFormField = async (field: FieldElement) => {
  const { localName, id } = field;
  const [name, type] = ['name', 'type'].map((attr) => field.getAttribute(attr));
  let value: FieldValue = '';

  if (
    'checked' in field &&
    (type === 'checkbox' ||
      ['checkbox', 'switch'].some((cbType) => localName.includes(cbType)))
  ) {
    value = field.checked;
  } else if (
    ['number', 'range'].includes(type as string) ||
    localName.includes('slider')
  ) {
    value = validateNumberInput(field as HTMLInputElement);
  } else if (field.hasAttribute('data-validate-formula')) {
    value = await validateFormulaInput(field as HTMLInputElement);
  } else if ('value' in field) {
    value = String(field.value);
    field.value = value;
  }

  return {
    key: name || id,
    value,
    required: !!('required' in field && field.required),
  };
};
