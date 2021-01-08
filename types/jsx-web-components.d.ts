type UntypedTags = Exclude<
  keyof HTMLElementTagNameMap,
  keyof JSX.IntrinsicElements
>;
type CustomTags = {
  [tag in UntypedTags]: tag extends `${infer A}-${infer B}` ? tag : never;
}[UntypedTags];

type RequiredProps<key extends CustomTags> = key extends 'sl-window'
  ? { name: string }
  : {};

import { JSX as SolidJSX } from 'solid-js';

declare module 'solid-js' {
  namespace JSX {
    type CustomElement<Element> = SolidJSX.HTMLAttributes<Element> &
      Partial<
        Pick<
          Element,
          Exclude<keyof Element, keyof HTMLElement> // TODO figure out edge cases?
        >
      >;

    type Customs = {
      [key in CustomTags]: CustomElement<HTMLElementTagNameMap[key]> &
        RequiredProps<key>;
    };

    interface IntrinsicElements extends Customs {}

    // interface IntrinsicElements {
    //   "sl-window": { name: string }
    // }
  }
}
