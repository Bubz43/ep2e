import { debounce } from '@src/utility/decorators';
import { assignStyles, resizeObsAvailable } from '@src/utility/dom';
import { customElement, html, LitElement, property, query } from 'lit-element';
import styles from './animated-list.scss';

type Info = { top: number; left: number; width: number; height: number };

/**
 * @slot
 */
@customElement('sl-animated-list')
export class AnimatedList extends LitElement {
  static get is() {
    return 'sl-animated-list' as const;
  }

  static styles = [styles];

  @property({ type: Number }) animationDuration = 250;

  @property({ type: Boolean }) fadeOnly = false;

  @property({ type: Boolean }) skipEntranceAnimation = false;

  @property({ type: Boolean }) skipExitAnimation = false;

  @property({ type: String }) transformOrigin: 'top' | 'center' | 'bottom' =
    'center';

  @query('slot#main')
  itemSlot!: HTMLSlotElement;

  @property({ type: Boolean }) noAnimations = false;

  private resizeObs?: ResizeObserver | null = null;

  private savedPositions = new Map<Element, Info>();

  private isReady = false;

  private initTimeout?: number;

  async connectedCallback() {
    super.connectedCallback();
    await this.updateComplete;
    // TODO: Media query for reduced motion which will skip ready
    if (resizeObsAvailable) {
      this.resizeObs = new ResizeObserver((entries) =>
        this.elResizeCallback(entries),
      );
      this.resizeObs.observe(this, { box: 'border-box' });
    }
    this.initTimeout = setTimeout(() => {
      this.isReady = true;
      this.storeElements(false);
    }, 1000);
  }

  disconnectedCallback() {
    clearTimeout(this.initTimeout);
    this.isReady = false;
    this.savedPositions.clear();
    this.resizeObs?.disconnect();
    this.resizeObs = null;
    super.disconnectedCallback();
  }

  toggleAnimations() {
    const { noAnimations } = this;
    this.noAnimations = true;
    setTimeout(() => (this.noAnimations = noAnimations), 300);
  }

  protected onSlotChange() {
    this.storeElements(true);
  }

  private get slottedItems() {
    return this.itemSlot.assignedElements({ flatten: true }) as HTMLElement[];
  }

  @debounce(400)
  private elResizeCallback(entries: Readonly<ResizeObserverEntry[]>) {
    const entriesChanged = entries.some(({ target, contentRect }) => {
      if (target === this) return true;
      const saved = this.savedPositions.get(target);
      if (saved) {
        const { width, height } = saved;
        return (
          Math.round(contentRect.width) !== width ||
          Math.round(contentRect.height) !== height
        );
      }
      return true;
    });
    if (entriesChanged) this.storeElements(false);
  }

  storeElements(animateNow: boolean) {
    if (!this.isReady) return;
    const animate = !this.noAnimations && animateNow;
    const {
      resizeObs,
      savedPositions: previousPositions,
      animationDuration,
      fadeOnly,
      transformOrigin,
      slottedItems,
    } = this;

    const keyframes: KeyframeEffect[] = [];
    const { length: listLength } = slottedItems;

    requestAnimationFrame(() => {
      this.savedPositions = new Map();
      slottedItems.forEach((el, index) => {
        const {
          offsetTop: top,
          offsetLeft: left,
          offsetWidth,
          offsetHeight,
        } = el;

        const saved = previousPositions.get(el);
        if (saved) {
          previousPositions.delete(el);
          const { top: savedTop, left: savedLeft } = saved;
          const leftChange = savedLeft - left;
          const topChange = savedTop - top;
          if (animate && (leftChange || topChange)) {
            keyframes.push(
              new KeyframeEffect(
                el,
                [
                  { transform: `translate(${leftChange}px, ${topChange}px)` },
                  {
                    transform: `translate(${leftChange}px, ${topChange}px)`,
                    offset: index / listLength,
                  },
                  { transform: 'translate(0)' },
                ],
                { duration: animationDuration, easing: 'ease-out' },
              ),
            );
          }
        } else {
          resizeObs?.observe(el, { box: 'border-box' });
          // First call to this method is always animate false
          if (animate && !this.skipEntranceAnimation) {
            const keyframe = new KeyframeEffect(
              el,
              {
                transform: fadeOnly ? [] : ['scaleY(0.25)', 'scaleY(1)'],
                opacity: [0.5, 1],
                transformOrigin: [transformOrigin, transformOrigin],
              },
              { duration: animationDuration, easing: 'ease-in-out' },
            );
            keyframes.push(keyframe);
          }
        }
        this.savedPositions.set(el, {
          top,
          left,
          width: offsetWidth,
          height: offsetHeight,
        });
      });

      !this.skipExitAnimation &&
        previousPositions.forEach(({ top, left, width, height }, deletedEl) => {
          if (deletedEl.hasAttribute('data-skip-exit-animation')) return;
          assignStyles(deletedEl as HTMLElement, {
            position: 'absolute',
            top: `${top}px`,
            left: `${left}px`,
            minWidth: `${width}px`,
            minHeight: `${height}px`,
            transformOrigin: 'top',
          }).slot = 'deleted';
          this.append(deletedEl);
          resizeObs?.unobserve(deletedEl);
          requestAnimationFrame(() => {
            deletedEl.animate(
              {
                transform: fadeOnly ? [] : [`scaleY(0.75)`, `scaleY(0.25)`],
                opacity: [0.75, 0.25],
                transformOrigin: [transformOrigin, transformOrigin],
              },
              { duration: animationDuration / 2, easing: 'ease-in-out' },
            ).onfinish = () => deletedEl.remove();
          });
        });

      previousPositions.clear();

      for (const keyframe of keyframes) {
        new Animation(keyframe).play();
      }
    });
  }

  render() {
    return html`
      <ul>
        <slot id="main" @slotchange=${this.onSlotChange}></slot>
        <slot name="deleted" id="deleted-items"></slot>
      </ul>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-animated-list': AnimatedList;
  }
}
