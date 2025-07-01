import { IconButtonToggle } from '@material/mwc-icon-button-toggle';
import { debounce } from '@src/utility/decorators';
import { assignStyles, px, resizeObsAvailable } from '@src/utility/dom';
import {
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  query,
  state,
} from 'lit-element';
import { render } from 'lit-html';
import { classMap } from 'lit-html/directives/class-map';
import mix from 'mix-with/lib';
import { clamp, equals, first } from 'remeda';
import { queryParentRoots } from 'weightless';
import { addListener } from 'weightless/util/event';
import { ListenerSubscription } from '../mixins/listeners';
import { OpenEvent, Origin, Placement } from './popover-options';
import styles from './popover.scss';

const placements = Object.values(Placement);

const oppositePlacement = (placement: Placement) => {
  switch (placement) {
    case Placement.Bottom:
      return Placement.Top;
    case Placement.Top:
      return Placement.Bottom;
    case Placement.Right:
      return Placement.Left;
    case Placement.Left:
      return Placement.Right;
  }
};

/**
 * @slot base
 */
@customElement('sl-popover')
export class Popover extends mix(LitElement).with(ListenerSubscription) {
  static get is() {
    return 'sl-popover' as const;
  }

  static styles = [styles];

  private static tempContainerTemplate: HTMLTemplateElement | null = null;

  private static get tempContainer() {
    if (!Popover.tempContainerTemplate) {
      const template = document.createElement('template');
      template.innerHTML = '<div style="display: contents"></div>';
      Popover.tempContainerTemplate = template;
    }
    return document
      .importNode(Popover.tempContainerTemplate.content, true)
      .querySelector('div')!;
  }

  @property({ type: Boolean, reflect: true }) open = false;

  @property({ type: String }) focusSelector = '';

  @property({ type: Boolean }) minimal = false;

  @property({ type: Boolean }) disabled = false;

  @property({ type: Number }) offset = 5;

  @property({ type: String }) placement: Placement = Placement.Bottom;

  @property({ type: String }) origin: Origin = Origin.Outset;

  @property({ type: String }) openEvent: OpenEvent = OpenEvent.Click;

  @property({ type: Boolean }) noBaseRefocus = false;

  @property({ type: Boolean }) arrow = false;

  @property({ type: String }) scrollContainerQuery = '';

  @property({ type: Boolean }) padded = false;

  @state() private arrowPlacement: Placement = Placement.Left;

  @property({
    type: Array,
    hasChanged(value: string[], oldValue: string[]) {
      return !equals(value, oldValue);
    },
  })
  closeEvents: string[] = [];

  @property({ type: Boolean }) center = false;

  @property({
    attribute: false,
    hasChanged() {
      return true;
    },
  })
  renderOnDemand?: (popover: Popover) => unknown;

  @property({ type: Boolean }) noAnimation = false;

  @property({ type: Number }) delay = 0;

  @query('.floater')
  private floater!: HTMLElement;

  @query('slot[name="base"]')
  private baseSlot!: HTMLSlotElement;

  @query('slot.floating-content')
  private contentSlot!: HTMLSlotElement;

  private tempContainer?: HTMLElement | null;

  private ignoreGlobalClick = false;

  private globalClosed = false;

  private pointerExit = false;

  private resizeObs?: ResizeObserver;

  private delayTimeout?: ReturnType<typeof setTimeout>;

  private positioningBase?: Record<
    'top' | 'left' | 'width' | 'height',
    number
  > | null;

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.open) this.open = false;
  }

  shouldUpdate(changedProps: PropertyValues<this>) {
    this.ignoreGlobalClick = false;
    if (changedProps.get('renderOnDemand') !== undefined) {
      if (this.open && this.tempContainer && this.renderOnDemand) {
        render(this.renderOnDemand(this), this.tempContainer, {
          eventContext: this.getEventContext(),
        });
        requestAnimationFrame(() => this.repositionFromEvent());
      }

      if (changedProps.size === 1) return false;
    }
    return super.shouldUpdate(changedProps);
  }

  updated(changedProps: PropertyValues<this>) {
    if (changedProps.get('open') !== undefined) {
      requestAnimationFrame(() => (this.open ? this.show() : this.close()));
    }
    super.updated(changedProps);
  }

  private selfClose = () => {
    this.delayTimeout ?? clearTimeout(this.delayTimeout);
    this.open = false;
  };

  async toggle(ev?: Event) {
    if (this.disabled) this.selfClose();
    else {
      if (!ev) this.open = !this.open;
      else this.handleLocalEvents(ev);
    }
  }

  private get base(): Element {
    return this.baseSlot.assignedElements()[0] || this;
  }

  @debounce(100)
  hoverLeave() {
    if (!this.pointerExit) this.selfClose();
    else this.pointerExit = false;
  }

  @debounce()
  private repositionFromEvent() {
    this.positioningBase = this.getPositioningBase();
    this.positionFloater();
  }

  private globalClickListener(ev: Event) {
    if (this.ignoreGlobalClick) {
      this.ignoreGlobalClick = false;
      return;
    }
    const { base } = this;
    const composedPath = ev.composedPath();
    const elements = new Set<EventTarget>(base ? [base, this] : [this]);
    if (
      !composedPath.some(
        (el) =>
          elements.has(el) ||
          (el instanceof HTMLElement &&
            (el.classList.contains('filepicker') ||
              el.id === 'macros-popout' ||
              el.localName === 'mwc-menu')),
      )
    ) {
      this.globalClosed = true;
      this.selfClose();
    }
  }

  private findScrollContainer() {
    if (this.scrollContainerQuery) {
      try {
        const { parentElement } = this;
        return (
          this.closest(this.scrollContainerQuery) ||
          (parentElement &&
            first(
              queryParentRoots<HTMLElement>(
                parentElement,
                this.scrollContainerQuery,
              ),
            ))
        );
      } catch (error) {
        console.log(error);
      }
    }
    return null;
  }

  private async show() {
    this.floater.togglePopover(true)
    await this.appendTemplateContent();
    await this.positionFloater();
    this.addListenerSubs(
      addListener(
        window,
        ['click', 'contextmenu'],
        (ev) => ev && this.globalClickListener(ev),
      ),
      addListener(this, [...this.closeEvents, 'delete'], this.selfClose),
      addListener(
        window,
        'keydown',
        (ev) => {
          if (ev instanceof KeyboardEvent && ev.key === 'Escape') {
            ev.stopPropagation();
            this.selfClose();
          }
        },
        { capture: true },
      ),
      addListener(this.contentSlot, 'slotchange', () =>
        this.repositionFromEvent(),
      ),
    );
    const scrollContainer = this.findScrollContainer();
    if (scrollContainer) {
      this.addListenerSubs(
        addListener(
          scrollContainer,
          'scroll',
          () => this.repositionFromEvent(),
          { passive: true },
        ),
      );
    }
    if (resizeObsAvailable) {
      this.resizeObs = new ResizeObserver(() => this.positionFloater());
      this.resizeObs.observe(this.floater);
    }

    this.focusElement();
    if (this.noAnimation) this.emitOpenEvent();
    else {
      this.floater.addEventListener(
        'animationend',
        () => {
          this.emitOpenEvent();
        },
        { once: true },
      );
    }
  }

  private emitOpenEvent() {
    this.dispatchEvent(new CustomEvent('popover-open'));
  }

  private async close() {
    const [firstElement] = this.baseSlot.assignedElements();
    if (firstElement instanceof IconButtonToggle) firstElement.on = false;
    this.clearListenerSubs().blur();

    const { floater, noAnimation } = this;
    this.resizeObs?.disconnect();
    const hadFocus = this.matches(':focus-within');

    const closingAnimation = floater.animate(
      {
        opacity: [1, 0.25],
        transform: ['scale(1)', 'scale(0.5)'],
      },
      { duration: noAnimation ? 0 : 100, easing: 'ease-in-out' },
    );
    closingAnimation.onfinish = () => {
      floater.togglePopover(false);
      floater.style.display = '';
      if (this.tempContainer) {
        this.tempContainer.remove();
        this.tempContainer = null;
      }
      if (
        this.openEvent !== OpenEvent.Hover &&
        !this.noBaseRefocus &&
        hadFocus &&
        !this.globalClosed &&
        firstElement instanceof HTMLElement &&
        !firstElement.hasAttribute('disabled')
      ) {
        firstElement.focus();
      }

      this.globalClosed = false;
    };
    return closingAnimation.finished;
  }

  private focusElement() {
    if (this.focusSelector) {
      try {
        for (const slotted of this.contentSlot.assignedElements()) {
          const el = slotted.querySelector<HTMLElement>(this.focusSelector);
          if (el instanceof HTMLElement) {
            el.focus();
            break;
          }
        }
      } catch (error) {
        console.log(error);
      }
    }
  }

  private handleLocalEvents(ev: Event) {
    if (this.disabled) return;

    const { type } = ev;
    const { open, openEvent } = this;
    if (open) {
      switch (type) {
        case 'contextmenu':
        case 'click':
          if (this.origin === Origin.Pointer && type === this.openEvent) {
            this.positioningBase = this.getPositioningBase(ev);
            this.positionFloater();
          } else this.open = openEvent === OpenEvent.Hover;
          break;

        default:
          break;
      }
    } else {
      if (type === openEvent) {
        this.positioningBase = this.getPositioningBase(ev);
        this.delay
          ? (this.delayTimeout = setTimeout(
            () => (this.open = true),
            this.delay,
          ))
          : (this.open = true);
        // this.open = true;
        if (
          openEvent === OpenEvent.Hover &&
          !(ev instanceof PointerEvent && ev.pointerType !== 'mouse')
        ) {
          this.addListenerSubs(
            addListener(this, 'pointerleave', () => this.hoverLeave()),
            ...[this.floater, this.base].map((el) =>
              addListener(el, ['pointerenter', 'pointerleave'], (e) => {
                if (e.type === 'pointerleave')
                  this.delayTimeout ?? clearTimeout(this.delayTimeout);
                this.pointerExit = e.type === 'pointerenter';
              }),
            ),
          );
        } else if (openEvent === OpenEvent.Click) {
          this.addListenerSubs(
            addListener(
              this,
              ['pointerup', 'pointerdown'],
              () => (this.ignoreGlobalClick = true),
            ),
            addListener(
              this,
              ['drop', 'dragend'],
              () => (this.ignoreGlobalClick = false),
            ),
          );
        }
      }
    }
  }

  private getPositioningBase(ev?: Event) {
    const { origin, offset } = this;
    const { top, left, width, height } = this.base.getBoundingClientRect();
    if (origin === Origin.Pointer && ev instanceof MouseEvent) {
      const { pageX, pageY } = ev;
      return {
        left: clamp(pageX, { min: left }) - offset,
        top: clamp(pageY, { min: top }) - offset,
        width: 10 + 2 * offset,
        height: 10 + 2 * offset,
      };
    }
    return {
      left: left - offset,
      top: top - offset,
      width: width + 2 * offset,
      height: height + 2 * offset,
    };
  }

  private getEventContext() {
    const rootNode = this.getRootNode();
    return rootNode instanceof ShadowRoot ? rootNode.host : rootNode;
  }

  private async appendTemplateContent() {
    const { renderOnDemand } = this;
    this.tempContainer?.remove();
    if (!renderOnDemand) return;
    await new Promise<void>((resolve) => {
      this.tempContainer = Popover.tempContainer;
      this.append(this.tempContainer);
      render(renderOnDemand(this), this.tempContainer, {
        eventContext: this.getEventContext(),
      });
      resolve();
    });
  }

  private async positionFloater() {
    if (!this.positioningBase) this.positioningBase = this.getPositioningBase();
    const { floater, placement, positioningBase, center, origin } = this;
    const { innerHeight: wHeight, innerWidth: wWidth } = window;
    const innerHeight = wHeight - 6;
    const innerWidth = wWidth - 6;
    const { top, left, width, height } = positioningBase;
    const placeInside = origin === Origin.Inset;

    assignStyles(floater, {
      transformOrigin: 'top left',
      marginTop: '',
      marginLeft: '',
      display: 'block',
    });
    let finalPlacement = placement;
    let vertShift = 0;
    let hozShift = 0;
    let arrowOffset = '0px';
    const transformOrigin: [string, string] = ['0px', '0px'];

    const { top: fTop, left: fLeft } = floater.getBoundingClientRect();
    const { offsetHeight: fHeight, offsetWidth: fWidth } = floater;
    switch (placement) {
      case Placement.Left:
      case Placement.Right: {
        const vertTarget = center ? top + height / 2 : top;
        const vShiftOrigin = center ? fTop + fHeight / 2 : fTop;

        vertShift = vertTarget - vShiftOrigin;
        const newTop = fTop + vertShift;
        if (newTop < 0) vertShift += 0 - newTop;
        const newBottom = fTop + vertShift + fHeight;

        if (newBottom > innerHeight) vertShift -= newBottom - innerHeight;

        const placeRight = (placeInside ? left - fWidth : left) - fLeft + width;
        const placeLeft = (placeInside ? left + fWidth : left) - fLeft - fWidth;

        if (placement === Placement.Right) {
          hozShift = placeRight;
          if (fLeft + hozShift + fWidth > innerWidth) {
            hozShift = placeLeft;
            finalPlacement = Placement.Left;
          }
        } else {
          hozShift = placeLeft;
          if (fLeft + hozShift < 0) {
            hozShift = placeRight;
            finalPlacement = Placement.Right;
          }
        }

        const shift = vertTarget - (fTop + vertShift);

        transformOrigin[0] = placeInside
          ? finalPlacement
          : oppositePlacement(finalPlacement);
        transformOrigin[1] = px(shift);
        // TODO: check arrow positioning
        // TODO: Refactor this switch
        arrowOffset = px(clamp(shift, { min: 6, max: fHeight - 24 }));
        break;
      }
      case Placement.Top:
      case Placement.Bottom: {
        const hozTarget = center ? left + width / 2 : left;
        const hShiftOrigin = center ? fLeft + fWidth / 2 : fLeft;

        hozShift = hozTarget - hShiftOrigin;
        const newLeft = fLeft + hozShift;
        if (newLeft < 0) hozShift += 0 - newLeft;
        const newRight = fLeft + hozShift + fWidth;
        if (newRight > innerWidth) hozShift -= newRight - innerWidth;

        const placeTop = (placeInside ? top + height : top) - fTop - fHeight;
        const placeBelow = (placeInside ? top - height : top) - fTop + height;
        if (placement === Placement.Top) {
          vertShift = placeTop;
          if (fTop + vertShift < 0) {
            vertShift = placeBelow;
            finalPlacement = Placement.Bottom;
          }
        } else {
          vertShift = placeBelow;
          if (fTop + vertShift + fHeight > innerHeight) {
            vertShift = placeTop;
            finalPlacement = Placement.Top;
          }
        }

        const shift = hozTarget - (fLeft + hozShift);

        transformOrigin[0] = px(shift);
        transformOrigin[1] = oppositePlacement(finalPlacement);
        arrowOffset = px(
          // TODO: This breaks if popover is centered
          // clamp(shift + 0.15 * width, { min: 12, max: fWidth - 24 })
          clamp((this.center ? 6 : shift) + 0.5 * width, {
            min: 12,
            max: fWidth - 24,
          }),
        );
        break;
      }
    }

    this.arrowPlacement = oppositePlacement(finalPlacement);
    await this.updateComplete;
    assignStyles(floater, {
      transformOrigin: transformOrigin.join(' '),
      marginTop: px(vertShift),
      marginLeft: px(hozShift),
    }).style.setProperty('--_triangle-offset', arrowOffset);
  }

  render() {
    const { arrowPlacement, arrow, minimal, padded, open } = this;
    const floaterClasses: Record<string, boolean> = {
      open,
      minimal,
      animate: !this.noAnimation,
      padded,
    };
    if (arrow) {
      for (const placement of placements) {
        floaterClasses[`${placement}-triangle`] = arrowPlacement === placement;
      }
    }

    return html`
      <slot
        @click=${this.toggle}
        @pointerdown=${this.toggle}
        @pointerenter=${this.toggle}
        @contextmenu=${this.toggle}
        name="base"
      ></slot>
      <div class="floater ${classMap(floaterClasses)}" popover="manual">
        <div>
          <slot class="floating-content"></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-popover': Popover;
  }

  interface HTMLElement {
    togglePopover: (open: boolean) => void;
  }
}

