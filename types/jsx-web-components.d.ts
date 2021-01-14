// type UntypedTags = Exclude<
//   keyof HTMLElementTagNameMap,
//   keyof JSX.IntrinsicElements
// >;
// type CustomTags = {
//   [tag in UntypedTags]: tag extends `${infer A}-${infer B}` ? tag : never;
// }[UntypedTags];

// type RequiredProps<key extends CustomTags> = key extends 'sl-window'
//   ? { name: string }
//   : {};

// type WithDirs<T> = T & {
//   [key in T as `prop:${key}`]: T[key]
// }

// import { JSX as SolidJSX } from 'solid-js';

// declare module 'solid-js' {
//   namespace JSX {
//     type CustomElement<Element> = SolidJSX.HTMLAttributes<Element> &
//       WithDirs<
//         Partial<Pick<Element, Exclude<keyof Element, keyof HTMLElement>>>
//       >;

//     type Customs = {
//       [key in CustomTags]: CustomElement<HTMLElementTagNameMap[key]> &
//         RequiredProps<key>;
//     };

//     interface ImgHTMLAttributes<HTMLImageElement>
//       extends SolidJSX.HTMLAttributes<T> {
//       loading?: 'lazy';
//     }

//     interface IntrinsicElements extends Customs {}
//   }
// }
