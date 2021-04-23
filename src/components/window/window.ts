import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import { debounce } from '@src/utility/decorators';
import {
  assignStyles,
  dimensions,
  dragElement,
  isButton,
  joinCoor,
  leftTop,
  px,
  repositionIfNeeded,
  resizeElement,
  resizeObsAvailable,
  toggleTouchAction,
} from '@src/utility/dom';
import {
  customElement,
  eventOptions,
  html,
  LitElement,
  property,
  query,
  TemplateResult,
} from 'lit-element';
import { NanoPopPosition, reposition } from 'nanopop';
import { anyPass, clamp, mapToObj } from 'remeda';
import { ResizeOption, SlWindowEventName } from './window-options';
import styles from './window.scss';

const shadowAnimationOptions = {
  duration: 300,
  fill: 'forwards',
  delay: 50,
  easing: 'ease-out',
} as const;

const shadowElStyles = {
  position: 'absolute',
  transformOrigin: 'top left',
  zIndex: '2000',
  background: 'rgba(10, 5, 20, 0.2)',
  overflow: 'hidden',
  pointerEvents: 'none',
} as const;

const resizeList = [
  ResizeOption.Both,
  ResizeOption.Vertical,
  ResizeOption.Horizontal,
] as const;

@customElement('sl-window')
export class SlWindow extends LitElement {
  static get is() {
    return 'sl-window' as const;
  }

  static styles = [styles];

  static focusedWindow: SlWindow | null = null;

  static container = document.body;

  private static _zIndex = 99;

  private static grantFocus(win: SlWindow) {
    if (!win.focused) {
      const { focusedWindow } = SlWindow;
      if (focusedWindow) focusedWindow.focused = false;
      win.focused = true;
      SlWindow.focusedWindow = win;
      requestAnimationFrame(() => SlWindow.updateZIndex(win));
    }
  }

  static unfocus(win: SlWindow) {
    if (win.focused) {
      win.focused = false;
      SlWindow.focusedWindow = null;
    }
  }

  static updateZIndex(win: SlWindow) {
    if (Number(win.style.zIndex) < this._zIndex) {
      win.style.zIndex = `${++this._zIndex}`;
    }
  }

  static headerButton({
    onClick,
    content,
    disabled = false,
  }: {
    onClick: (ev: MouseEvent) => unknown;
    content: TemplateResult;
    disabled?: boolean;
  }) {
    return html`
      <wl-list-item
        ?disabled=${disabled}
        clickable
        role="button"
        slot="header-button"
        @click=${onClick}
      >
        <div
          style="display: grid; grid-auto-flow: column; align-items: center; gap: 0.5ch; --mdc-icon-size: 1.25rem;"
        >
          ${content}
        </div>
      </wl-list-item>
    `;
  }

  @property({ type: Boolean, reflect: true })
  focused = false;

  @property({ type: Boolean, reflect: true })
  minimized = false;

  @property({ type: Boolean }) noremove?: boolean;

  @property({ type: String })
  name = 'New Window';

  @property({ type: String }) img?: string;

  @property({ type: String }) resizable = ResizeOption.None;

  @property({ type: String }) relativePosition: NanoPopPosition = 'left';

  @query('header') private header!: HTMLElement;

  @query('.content') private contentContainer!: HTMLElement;

  @query('slot[name="footer"]') private footerSlot!: HTMLSlotElement;

  @query('.close-button') private closeButton!: HTMLElement;

  private resizeObs!: ResizeObserver | null;

  private closing = false;

  async connectedCallback() {
    super.connectedCallback();
    this.gainFocus();
    await this.updateComplete;

    window.addEventListener('resize', this);
    requestAnimationFrame(() => {
      this.setupResizeObserver();
      if (!this.style.opacity) {
        this.animate(
          { opacity: [0, 1], transform: ['scale(0.97)', 'scale(1)'] },
          { duration: 300, easing: 'ease-out' },
        );
      }
    });
  }

  disconnectedCallback() {
    this.resizeObs?.disconnect();
    window.removeEventListener('resize', this);
    super.disconnectedCallback();
  }

  firstUpdated() {
    this.addEventListener('pointerdown', this);
    this.addEventListener('keydown', this);
  }

  handleEvent(ev: Event) {
    switch (ev.type) {
      case 'pointerdown': {
        const { header } = this;
        if (!ev.composedPath().some((el) => el === header)) this.gainFocus();
        break;
      }

      case 'resize':
        this.confirmPosition();
        break;

      case 'keydown': {
        const { key } = ev as KeyboardEvent;
        if (key === 'Escape') {
          ev.stopPropagation();
          this.closeButton.focus();
        } else if (
          key === 'Tab' ||
          key.startsWith('Arrow') ||
          key === 'Delete'
        ) {
          ev.stopPropagation();
        }

        break;
      }

      default:
        break;
    }
  }

  close() {
    if (this.closing || !this.isConnected) {
      return this.emit(SlWindowEventName.Closed);
    }

    this.closing = true;
    this.style.pointerEvents = 'none';
    this.emit(SlWindowEventName.Closing);
    SlWindow.unfocus(this);
    return new Promise<void>((resolve) => {
      this.animate(
        { opacity: [1, 0], transform: ['scale(1)', 'scale(0.97)'] },
        { duration: 200 },
      ).onfinish = () => {
        this.style.pointerEvents = '';

        resolve();
        this.closing = false;
        this.emit(SlWindowEventName.Closed);
        if (!this.noremove) this.remove();
      };
    });
  }

  toggleMinimize() {
    const { offsetWidth, contentContainer } = this;
    this.minimized = !this.minimized;
    requestAnimationFrame(() => {
      this.animate(
        {
          width: [px(offsetWidth), px(this.offsetWidth)],
        },
        { duration: 150 },
      );
      if (!this.minimized) {
        contentContainer.style.overflowX = 'hidden';
        contentContainer.animate(
          {
            opacity: [0, 0, 0.75, 1],
          },
          { duration: 350, easing: 'ease-out' },
        ).onfinish = () => (contentContainer.style.overflowX = '');
      }
    });
  }

  gainFocus() {
    if (!this.resizeObs) this.confirmPosition();
    SlWindow.grantFocus(this);
    return this;
  }

  async positionAdjacentToElement(toEl: HTMLElement) {
    if (!toEl?.offsetParent) return;

    const noAnimation = this.isConnected;
    if (!noAnimation) this.style.opacity = '0';
    return new Promise<void>((resolve) => {
      const onFinish = () => {
        requestAnimationFrame(() => {
          this.style.opacity = '';
          this.gainFocus();
          resolve();
        });
      };
      requestAnimationFrame(() => {
        reposition(toEl, this, { position: this.relativePosition });
        if (noAnimation) onFinish();
        else this.animateShadowEl(toEl, onFinish);
      });
    });
  }

  private animateShadowEl(toEl: HTMLElement, onFinish: () => void) {
    const relativeRect = toEl.getBoundingClientRect();
    const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = this;
    const div = document.createElement('div');
    document.body.appendChild(div);

    assignStyles(div, {
      borderRadius: getComputedStyle(toEl).borderRadius,
      ...shadowElStyles,
      ...mapToObj([...leftTop, ...dimensions], (prop) => [
        prop,
        px(relativeRect[prop]),
      ]),
    }).animate(
      {
        transform: [
          `translate(0) scale(1)`,
          `translate(${joinCoor({
            x: offsetLeft - relativeRect.left,
            y: offsetTop - relativeRect.top,
          })}) scale(${[
            offsetWidth / relativeRect.width,
            offsetHeight / relativeRect.height,
          ]
            .map((val) => Math.min(val, 10000))
            .join(', ')})`,
        ],
      },
      {
        ...shadowAnimationOptions,
        duration: shadowAnimationOptions.duration - 100,
      },
    ).onfinish = () => {
      const opacity = [1, 0];
      div.animate({ opacity }, shadowAnimationOptions).onfinish = () =>
        div.remove();
      this.animate(
        { opacity: opacity.reverse() },
        { duration: shadowAnimationOptions.duration },
      ).onfinish = onFinish;
    };
  }

  private get hasChangedSize() {
    const { height, width } = this.contentContainer.style;
    return !!(height || width);
  }

  private resetSize() {
    if (this.hasChangedSize) {
      assignStyles(this.contentContainer, { height: '', width: '' });
    }
  }

  private repositionWithinWindow(ev: MouseEvent) {
    if (ev.button === 1) repositionIfNeeded(this, document.body);
  }

  private resize(ev: MouseEvent) {
    const { currentTarget } = ev;
    if (currentTarget instanceof HTMLElement) {
      const resize = currentTarget.getAttribute('data-resize') as ResizeOption;
      const reverse = currentTarget.classList.contains('alt');

      const [width, height] = [
        ResizeOption.Horizontal,
        ResizeOption.Vertical,
      ].map((option) => resize === option || resize === ResizeOption.Both);

      const { bottom, right, top, left } = this.getBoundingClientRect();
      const { contentContainer, header, footerSlot } = this;
      const { offsetHeight, offsetWidth } = SlWindow.container;

      const {
        minWidth,
        minHeight,
      } = (contentContainer.firstElementChild as HTMLSlotElement)
        .assignedElements({ flatten: true })
        .reduce(
          (accum, el) => {
            const { minHeight, minWidth } = getComputedStyle(el);
            // TODO: fix this to work with non px values
            // 100% min width is what I need
            accum.minHeight += parseInt(minHeight) || 0;
            accum.minWidth = Math.max(accum.minWidth, parseInt(minWidth) || 0);
            return accum;
          },
          {
            minHeight: 0,
            minWidth: parseInt(getComputedStyle(header).minWidth) || 0,
          },
        );

      this.resizeObs?.unobserve(this);

      if (reverse) {
        assignStyles(this, {
          top: 'unset',
          left: 'unset',
          bottom: px(offsetHeight - bottom),
          right: px(offsetWidth - right),
        });
      }

      const maxWidth = (reverse ? right : offsetWidth - left) - 5;
      const maxHeight =
        (reverse ? bottom : offsetHeight - top) -
        header.offsetHeight -
        footerSlot.offsetHeight;
      const undoTouch = toggleTouchAction(this);

      assignStyles(contentContainer, {
        maxWidth: px(maxWidth),
        maxHeight: px(maxHeight),
        minHeight: px(
          clamp(minHeight, {
            min: 0,
            max: offsetHeight - this.header.offsetHeight,
          }),
        ),
        // minWidth: px(clamp(minWidth, { min: 0, max: offsetWidth })),
      });

      resizeElement({
        element: contentContainer,
        ev,
        width,
        height,
        reverse,
        onEnd: () => {
          undoTouch();
          this.resizeObs?.observe(this);
          const { offsetWidth, offsetHeight } = contentContainer;
          const newMax =
            window.innerHeight - header.offsetHeight - footerSlot.offsetHeight;
          assignStyles(contentContainer, {
            maxWidth: '',
            maxHeight: '',
            // ...(width ? { width: px(Math.min(offsetWidth, maxWidth)) } : {}),
            // width: off
            ...(height || newMax < maxHeight
              ? { height: px(Math.min(offsetHeight, maxHeight, newMax)) }
              : {}),
          });
          if (reverse) {
            const { top, left } = this.getBoundingClientRect();
            assignStyles(this, {
              top: px(top),
              left: px(left),
              bottom: 'unset',
              right: 'unset',
            });
          }
        },
      });
    }
  }

  private get bounds() {
    return {
      offsetWidth:
        window.innerWidth +
        this.offsetWidth -
        clamp(Math.min(this.offsetWidth, 400), { min: 100 }),
      offsetHeight: window.innerHeight + this.offsetHeight - 32,
    };
  }

  private startDrag = (ev: MouseEvent) => {
    if (
      ev.defaultPrevented ||
      ev
        .composedPath()
        .some(anyPass([isButton, (e) => e instanceof HTMLInputElement]))
    )
      return;

    const { x, y } = ev;
    this.gainFocus();

    const distanceChecker = (ev: MouseEvent) => {
      if (Math.abs(ev.x - x) > 2 || Math.abs(ev.y - y) > 2) {
        cleanup();
        const undoTouch = toggleTouchAction(this);
        this.style.opacity = '0.8';
        dragElement({
          element: this,
          ev,
          onEnd: () => {
            undoTouch();
            this.style.opacity = '1';
          },
          bounds: this.bounds,
        });
      }
    };

    const cleanup = () => {
      document.body.removeEventListener('mousemove', distanceChecker);
    };
    document.body.addEventListener('mousemove', distanceChecker);
    document.body.addEventListener('mouseup', cleanup, { once: true });
  };

  @debounce(400)
  private confirmPosition() {
    repositionIfNeeded(this, this.bounds);
  }

  private setupResizeObserver() {
    if (!this.resizeObs && resizeObsAvailable) {
      this.resizeObs = new ResizeObserver(() => this.confirmPosition());
      this.resizeObs.observe(this);
    }
  }

  private emit(eventName: SlWindowEventName) {
    this.dispatchEvent(new CustomEvent(eventName));
  }

  @eventOptions({ capture: true })
  private openMenu(ev: MouseEvent) {
    ev.preventDefault();
    openMenu({
      header: { heading: this.name },
      content: [
        {
          label: `${localize('reset')} ${localize('size')}`,
          callback: () => this.resetSize(),
          icon: html`<mwc-icon>aspect_ratio</mwc-icon>`,
          disabled: !this.hasChangedSize || this.minimized,
        },
        {
          label: localize(this.minimized ? 'restore' : 'minimize'),
          callback: () => this.toggleMinimize(),
          icon: html`<mwc-icon
            >${this.minimized ? 'open_in_full' : 'minimize'}</mwc-icon
          >`,
        },
        'divider',
        {
          label: localize('close'),
          callback: () => this.close(),
          icon: html`<mwc-icon>close</mwc-icon>`,
        },
      ],
      position: ev,
    });
  }

  render() {
    /*
    const heading = html`<div class="heading">
      ${this.img ? html`<img height="24px" src=${this.img} />` : ''}
      <span>${this.name}</span>
    </div>`;
   ${this.minimized
          ? heading
          : html` <slot
              name="header"
              @slotchange=${this.toggleHeaderVisibility}
              @pointerdown=${this.gainFocus}
            >
              ${heading}
            </slot>`}

               <!-- <wl-list-item
            class="minimize-button"
            role="button"
            clickable
            @click=${this.toggleMinimize}
          >
            <mwc-icon>${this.minimized ? 'open_in_full' : 'remove'}</mwc-icon>
          </wl-list-item> -->
    */
    return html`
      <header
        id="header"
        @dblclick=${this.toggleMinimize}
        @mousedown=${this.startDrag}
        @contextmenu=${this.openMenu}
        @auxclick=${this.repositionWithinWindow}
      >
        <div class="heading">
          ${this.img ? html`<img height="24px" src=${this.img} />` : ''}
          <span>${this.name}</span>
        </div>

        <div class="controls">
          <slot name="header-button"> </slot>

          <wl-list-item
            class="close-button"
            role="button"
            clickable
            @click=${this.close}
          >
            <mwc-icon>close</mwc-icon>
          </wl-list-item>
        </div>
      </header>

      <focus-trap class="content">
        <slot></slot>
      </focus-trap>
      <slot name="footer"></slot>
      ${this.resizable !== ResizeOption.None
        ? resizeList.map((option) => {
            const hidden = ![ResizeOption.Both, option].includes(
              this.resizable,
            );
            return html`
              <div
                class="resize-handle ${option}-resize"
                data-resize=${option}
                @pointerdown=${this.resize}
                ?hidden=${hidden}
              ></div>
              ${option === ResizeOption.Both
                ? ''
                : html`
                    <div
                      class="resize-handle ${option}-resize alt"
                      data-resize=${option}
                      @pointerdown=${this.resize}
                      ?hidden=${hidden}
                    ></div>
                  `}
            `;
          })
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-window': SlWindow;
  }
}
