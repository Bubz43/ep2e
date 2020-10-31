import type { UpdateActions } from "@src/entities/update-store";
import { localize } from "@src/foundry/localization";
import { FieldValue, FieldProps, mapProps } from "@src/utility/field-values";
import { html } from "lit-html";
import { ifDefined } from "lit-html/directives/if-defined";
import type { PickByValue } from "utility-types";
import type { Form, SlFormData } from "./form";


export type FormHandlers<T extends Record<string, unknown>> = Pick<
  FormInstance<T>,
  "update" | "fields"
>;

const styles = () => html` <style>
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  select option,
  select optgroup {
    background: rgb(30, 30, 30);
  }
</style>`;

export type FormInstance<T extends Record<string, unknown>> = {
  props: T;
  update: (changed: Partial<PickByValue<T, FieldValue>>, original: T) => void;
  fields: (props: FieldProps<T>) => unknown;
  classes?: string;
  disabled?: boolean;
  slot?: string;
  noDebounce?: boolean
};

type GenericUpdate = FormInstance<Record<string, unknown>>["update"];

const autoUpdateCache = new WeakMap<
  GenericUpdate,
  (ev: FormValueStoredEvent) => void
>();

const createAutoUpdate = (update: GenericUpdate) => {
  const fn = ({ form }: FormValueStoredEvent) => {
    update(form.getAndClearFormData(), form.validProperties);
  };
  autoUpdateCache.set(update, fn);
  return fn;
};

export const renderAutoForm = <T extends Record<string, unknown>>({
  props,
  update,
  fields,
  classes,
  storeOnInput = false,
  disabled = false,
  slot,
  noDebounce = false
}: FormInstance<T> & { storeOnInput?: boolean }) => {
  return html`
    <sl-form
      ?disabled=${disabled}
      ?noDebounce=${noDebounce}
      .validProperties=${props}
      ?storeOnInput=${storeOnInput}
      slot=${ifDefined(slot)}
      submitEmpty
      class=${ifDefined(classes)}
      @form-value-stored=${autoUpdateCache.get(update as GenericUpdate) ||
      createAutoUpdate(update as GenericUpdate)}
    >
      ${fields(mapProps(props))} ${styles()}
    </sl-form>
  `;
};

// ? maybe get disabled state from updater
export const renderUpdaterForm = <T extends Record<string, unknown>>(
  actions: UpdateActions<T>,
  settings: Omit<FormInstance<T>, "props" | "update">
) => {
  return renderAutoForm({
    props: actions.originalValue(),
    update: (actions.commit as unknown) as FormInstance<T>["update"],
    ...settings,
  });
};

const submitUpdateCache = new WeakMap<
  GenericUpdate,
  (ev: CustomEvent<Record<string, unknown>>) => void
>();

const createSubmitUpdate = (update: GenericUpdate) => {
  const fn = (ev: CustomEvent<Record<string, unknown>>) => {
    update(ev.detail, (ev.currentTarget as Form).validProperties);
    ev.currentTarget?.dispatchEvent(
      new CustomEvent("form-submit", { bubbles: true })
    );
  };
  submitUpdateCache.set(update, fn);
  return fn;
};

export const renderSubmitForm = <T extends Record<string, unknown>>({
  props,
  update,
  fields,
  submitButtonText,
  submitEmpty = false,
  classes,
  disabled = false,
  slot,
  noDebounce = false
}: FormInstance<T> & { submitButtonText?: string; submitEmpty?: boolean }) => {
  return html`
    <sl-form
      ?noDebounce=${noDebounce}
      ?disabled=${disabled}
      .validProperties=${props}
      storeOnInput
      slot=${ifDefined(slot)}
      ?submitEmpty=${submitEmpty}
      class=${ifDefined(classes)}
      @form-data=${submitUpdateCache.get(update as GenericUpdate) ||
      createSubmitUpdate(update as GenericUpdate)}
    >
      ${fields(mapProps(props))}
      <submit-button
        slot="submit"
        label=${submitButtonText || localize("save")}
      ></submit-button>
      ${styles()}
    </sl-form>
  `;
};

export class FormValueStoredEvent extends Event {
   static get is() {
    return "form-value-stored" as const;
  }

  readonly form;
  constructor(form: Form) {
     super(FormValueStoredEvent.is);
    this.form = form;
  }
}

declare global {
  interface HTMLElementEventMap {
    "form-value-stored": FormValueStoredEvent;
  }
}


export class SlCustomStoreEvent extends Event {
  static get is() {
   return "form-custom-store" as const;
 }
 static dispatch(data: SlFormData) {
   return (ev: Event) =>
     ev.currentTarget?.dispatchEvent(new SlCustomStoreEvent(data));
 }

  constructor(public formData: SlFormData) {
    super(SlCustomStoreEvent.is, { bubbles: true, composed: true });
   
 }
}

declare global {
 interface HTMLElementEventMap {
   "form-custom-store": SlCustomStoreEvent;
 }
}



