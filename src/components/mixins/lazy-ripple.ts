import type { Ripple } from '@material/mwc-ripple';
import { RippleHandlers } from '@material/mwc-ripple/ripple-handlers';
import { eventOptions, LitElement, queryAsync, state } from 'lit-element';
import { html } from 'lit-html';
import type { Class } from 'type-fest';

export const LazyRipple = (Base: Class<LitElement>) => {
  class LazyLoadRipple extends Base {
    @queryAsync('mwc-ripple') ripple!: Promise<Ripple | null>;

    @state() protected shouldRenderRipple = false;

    protected rippleHandlers = new RippleHandlers(() => {
      this.shouldRenderRipple = true;
      // TODO Check if this is needed again later
      // return (this.ripple as unknown) as Promise<RippleAPI>;
      return this.ripple;
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
