import type { PickByValue } from "utility-types";
import { localize, LangEntry } from "../foundry/localization";

export type FieldValue = string | number | boolean;

export type ValuedProp<
  T extends FieldValue = FieldValue,
  P extends string = string
> = {
  readonly value: T;
  label: string;
  readonly prop: P;
};

export type FieldProps<
  T extends Record<string, unknown>,
  M = PickByValue<T, FieldValue>
> = {
  [P in keyof M]: {
    readonly value: M[P];
    label: string;
    readonly prop: P;
  };
};

export type FieldPropsRenderer<T extends Record<string, unknown>> = (
  valuedProps: FieldProps<T>
) => unknown;


export const isFieldValue = (value: unknown): value is FieldValue => {
  switch (typeof value) {
    case "boolean":
    case "number":
    case "string":
      return true;

    default:
      return false;
  }
};

export const mapProps = <T extends Record<string, unknown>>(props: T) => {
  const mapped: Record<string, ValuedProp> = {};

  for (const [prop, value] of Object.entries(props)) {
    if (isFieldValue(value)) {
      mapped[prop] = { value, label: localize(prop as LangEntry), prop };
    }
  }

  return mapped as FieldProps<T>;
};
