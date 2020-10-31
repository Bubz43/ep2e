import { mapToObj, pipe, map, clamp, prop, createPipe, filter } from "remeda";
import type { LiteralUnion } from "type-fest";
import type { NonFunctionKeys } from "utility-types";
import { fromPairs, nonNegative } from "./helpers";

export const resizeObsAvailable = "ResizeObserver" in window;

export const getParentElement = (element: HTMLElement) => {
  const { parentElement } = element;
  if (parentElement) return parentElement;

  const rootNode = element.getRootNode();
  return (
    (rootNode instanceof ShadowRoot &&
      rootNode.host instanceof HTMLElement &&
      rootNode.host) ||
    undefined
  );
};

export const leftTop = ["left", "top"] as const;
export const dimensions = ["width", "height"] as const;
export const sizeOffsets = ["offsetWidth", "offsetHeight"] as const;
export const px = (value: number) => `${value}px`;

type Bounds = Pick<HTMLElement, "offsetWidth" | "offsetHeight">;

export const containElement = (
  { offsetWidth, offsetHeight }: HTMLElement,
  bounds: Bounds = document.body
) => {
  const size = { offsetHeight, offsetWidth };
  const max = mapToObj(sizeOffsets, (prop) =>
    [
      prop === "offsetHeight" ? "top" : "left",
      nonNegative(bounds[prop] - size[prop]),
    ]);


  const clampPosition = (position: Record<"top" | "left", number>) =>
    pipe(
      [...leftTop],
      map((prop) => {
        const value = position[prop];
        const clamped = clamp(value, { min: 0, max: max[prop] });
        return [
          prop,
          {
            style: px(clamped),
            change: clamped - value,
            newPos: clamped,
          },
        ] as const;
      }),
      fromPairs,
      ({ top, left }) => ({
        top,
        left,
        style: {
          top: top.style,
          left: left.style,
          right: "unset",
          bottom: "unset",
        },
      })
    );

  return { max, clampPosition, ...size };
};
const positionKeyframes = { duration: 300, easing: "ease-in-out" };

export const assignStyles = <T extends HTMLElement>(
  element: T,
  styles: Partial<Record<NonFunctionKeys<CSSStyleDeclaration>, string>>
) => {
  Object.assign(element.style, styles);
  return element;
};

export const joinCoor = ({ x, y }: { x: number; y: number }) =>
  [x, y].map(px).join(", ");

export const repositionIfNeeded = (element: HTMLElement, bounds?: Bounds) => {
  const { max, clampPosition } = containElement(
    element,
    bounds || getParentElement(element)
  );

  const { offsetLeft: left, offsetTop: top } = element;
  const elPosition = { left, top };
  const outOfBounds = leftTop.some((prop) => {
    const val = elPosition[prop];
    return val > max[prop] || val < 0;
  });
  return (
    outOfBounds &&
    new Promise<boolean>((resolve) => {
      const { top, left, style } = clampPosition(elPosition);
      element.animate(
        {
          transform: [
            "translate(0)",
            `translate(${[left, top].map(prop("change")).map(px).join(", ")})`,
          ],
        },
        positionKeyframes
      ).onfinish = () => {
        assignStyles(element, style);
        resolve(outOfBounds);
      };
    })
  );
};

type EventType = LiteralUnion<keyof GlobalEventHandlersEventMap, string>;

type StartEndInit<
  T extends EventType,
  E extends EventType,
  X extends EventTarget
> = {
  event: T;
  /**
   *  Cannot be the same as event
   */
  endEvent: T extends E ? never : E;
  listener: (
    ev: T extends keyof GlobalEventHandlersEventMap
      ? GlobalEventHandlersEventMap[T]
      : Event
  ) => unknown;
  onEnd?: () => unknown;
  target: X;
};

export const listenThenRemoveEvent = <
  T extends EventType,
  E extends EventType,
  X extends EventTarget
>({
  event,
  endEvent,
  listener,
  target,
  onEnd,
}: StartEndInit<T, E, X>) => {
  target.addEventListener(
    event,
    listener as EventListenerOrEventListenerObject
  );
  target.addEventListener(
    endEvent,
    () => {
      onEnd?.();
      target.removeEventListener(
        event,
        listener as EventListenerOrEventListenerObject
      );
    },
    { once: true }
  );
  return target;
};

type PointerPosition = Record<"pageX" | "pageY", number>;

const initialPositions = (
  { offsetLeft, offsetTop }: HTMLElement,
  { pageX, pageY }: PointerPosition
) => ({
  offsetLeft,
  offsetTop,
  pageX,
  pageY,
  diffX: offsetLeft - pageX,
  diffY: offsetTop - pageY,
});

const initialSize = (
  { offsetWidth, offsetHeight }: HTMLElement,
  { pageX, pageY }: PointerPosition
) => ({
  offsetHeight,
  offsetWidth,
  pageX,
  pageY,
  diffX: offsetWidth - pageX,
  diffY: offsetHeight - pageY,
});

type PointerInit = {
  element: HTMLElement;
  ev: PointerEvent;
  onEnd?: () => unknown;
};

type ElementDragInit = PointerInit & {
  bounds?: Bounds;
};

export const resetPositions = (el: HTMLElement) =>
  assignStyles(el, { top: "", left: "", bottom: "", right: "" });

export const dragElement = ({
  element,
  ev,
  bounds,
  onEnd,
}: ElementDragInit) => {
  const { clampPosition } = containElement(element, bounds);
  listenThenRemoveEvent({
    event: "pointermove",
    endEvent: "pointerup",
    onEnd,
    target: window,
    listener: pipe(initialPositions(element, ev), ({ diffX, diffY }) =>
      createPipe(
        ({ pageX, pageY }: PointerPosition) =>
          clampPosition({
            top: diffY + pageY,
            left: diffX + pageX,
          }),
        ({ style }) =>
          assignStyles(element, { ...style, right: "unset", bottom: "unset" })
      )
    ),
  });
  return element;
};

type ResizeInit = PointerInit &
  Partial<{
    width: boolean;
    height: boolean;
    reverse: boolean;
    bounds: Bounds;
  }>;

export const resizeElement = ({
  element,
  ev,
  width = true,
  height = true,
  onEnd,
  reverse,
}: ResizeInit) => {
  listenThenRemoveEvent({
    event: "pointermove",
    endEvent: "pointerup",
    onEnd,
    target: window,
    listener: pipe(
      initialSize(element, ev),
      ({ pageY, pageX, offsetHeight, offsetWidth }) => [
        [height, "height", "pageY", pageY, offsetHeight] as const,
        [width, "width", "pageX", pageX, offsetWidth] as const,
      ],
      filter(([use]) => use),
      map(([, ...vals]) => vals),
      (initial) => (moveEv: PointerPosition) => {
        for (const [dimension, coorName, origCoor, origDim] of initial) {
          const amount = moveEv[coorName] - origCoor;
          element.style[dimension] = px(
            origDim + (reverse ? -amount : amount)
            // Math.min(origDim + (reverse ? -amount : amount), origCoor + origDim)
          );
        }
      }
    ),
  });
  return element;
};

type PositioningOptions = {
  toEl: HTMLElement | DOMRect;
  element: HTMLElement;
  preferRight?: boolean;
  spacing?: number;
  bounds?: Bounds;
};

const placeToRight = ({ right, spacing }: { right: number; spacing: number }) =>
  right + spacing;
const placeToLeft = ({
  left,
  offsetWidth,
  spacing,
}: {
  left: number;
  offsetWidth: number;
  spacing: number;
}) => left - offsetWidth - spacing;


export const togglePointerEvents = (el: HTMLElement) => {
  el.style.pointerEvents = "none";
  return () => (el.style.pointerEvents = "");
};

export const toggleTouchAction = (el: HTMLElement) => {
  el.style.touchAction = "none";
  return () => (el.style.touchAction = "");
};

export const backgroundImageStyle = (url: string) =>
  `background-image: url("${url}");`;

export const topLeftToBottomRight = (element: HTMLElement) => {
  const { bottom, right } = element.getBoundingClientRect();
  const { innerHeight, innerWidth } = window;
  return {
    top: "",
    left: "",
    right: px(innerWidth - right),
    bottom: px(innerHeight - bottom),
  };
};


export const findMatchingElement = (ev: Event, selector: string)=> {
  let item: HTMLElement | null = null;
  try {
    for (const target of ev.composedPath()) {
      if (target instanceof HTMLElement && target.matches(selector)) {
        item = target;
        break;
      }
    }
  } catch (error) {
    console.log(error);
  }
  return item;
}