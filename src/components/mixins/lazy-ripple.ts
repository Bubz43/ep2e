import {
  LitElement,
  queryAsync,
  internalProperty,
  eventOptions,
} from 'lit-element';
import { html } from 'lit-html';
import type { Class } from 'type-fest';
import type { Ripple } from 'weightless/ripple/ripple';
import {
  RippleHandlers,
  RippleAPI,
} from '@material/mwc-ripple/ripple-handlers';

export const LazyRipple = (Base: Class<LitElement>) => {
  class LazyLoadRipple extends Base {
    @queryAsync('mwc-ripple') ripple!: Promise<Ripple | null>;

    @internalProperty() protected shouldRenderRipple = false;

    protected rippleHandlers = new RippleHandlers(() => {
      this.shouldRenderRipple = true;
      // TODO Check if this is needed again later
      return (this.ripple as unknown) as Promise<RippleAPI>;
    });

    protected renderRipple(disabled = false) {
      return html`${this.shouldRenderRipple
        ? html` <mwc-ripple ?disabled=${disabled}> </mwc-ripple>`
        : ''}`;
    }

    @eventOptions({ passive: true })
    protected handleRippleMouseDown(event?: Event) {
      const onUp = () => {
        window.removeEventListener('mouseup', onUp);

        this.handleRippleDeactivate();
      };

      window.addEventListener('mouseup', onUp);
      this.rippleHandlers.startPress(event);
    }

    @eventOptions({ passive: true })
    protected handleRippleTouchStart(event?: Event) {
      this.rippleHandlers.startPress(event);
    }

    protected handleRippleDeactivate() {
      this.rippleHandlers.endPress();
    }

    protected handleRippleMouseEnter() {
      this.rippleHandlers.startHover();
    }

    protected handleRippleMouseLeave() {
      this.rippleHandlers.endHover();
    }

    protected handleRippleFocus() {
      this.rippleHandlers.startFocus();
    }

    protected handleRippleBlur() {
      this.rippleHandlers.endFocus();
    }
  }
  return LazyLoadRipple;
};
