import {
  TimeInterval,
  CommonInterval,
  prettyMilliseconds,
  timeIntervals,
} from '@src/features/time';
import {
  toMilliseconds,
  parseMilliseconds,
} from '@src/features/modify-milliseconds';
import { localize } from '@src/foundry/localization';
import { debounce } from '@src/utility/decorators';
import {
  customElement,
  LitElement,
  property,
  html,
  PropertyValues,
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { pipe, clamp, range } from 'remeda';
import { renderNumberInput } from '../field/fields';
import { renderAutoForm } from '../form/forms';
import styles from './time-field.scss';

@customElement('time-field')
export class TimeField extends LitElement {
  static get is() {
    return 'time-field' as const;
  }

  static styles = [styles];

  @property({ type: Number }) value = 0;

  @property({ type: Number }) min?: number;

  @property({ type: Number }) max?: number;

  @property({ type: Boolean, reflect: true }) disabled = false;

  @property({ type: String }) label = '';

  @property({ type: String }) permanentLabel?: string;

  @property({ type: String }) whenZero?: string;

  @debounce(250, true)
  private updateSlottedInputs() {
    const newTime = String(this.value);
    this.querySelectorAll('input').forEach((el) => {
      if (el.value === newTime) return;
      el.value = newTime;
      el.dispatchEvent(
        new Event('change', {
          bubbles: true,
          composed: true,
          cancelable: true,
        }),
      );
    });
  }

  updated(changedProps: PropertyValues) {
    if (changedProps.has('value')) {
      this.updateSlottedInputs();
    }
  }

  private updateValue = ({
    turns,
    ...changed
  }: Partial<Record<TimeInterval, number> & { turns: number }>) => {
    const { parts, min, max } = this;
    this.value = pipe(
      {
        ...parts,
        ...changed,
        seconds: typeof turns === 'number' ? turns * 3 : parts.seconds,
      },
      toMilliseconds,
      clamp({ min, max }),
    );
  };

  private get parts() {
    const { value, min, max } = this;
    return pipe(value, clamp({ min, max }), parseMilliseconds);
  }

  private toggleInfinite() {
    this.value = this.infinite
      ? clamp(CommonInterval.Instant, { min: this.min, max: this.max })
      : CommonInterval.Indefinite;
  }

  get infinite() {
    return this.value < CommonInterval.Instant;
  }

  render() {
    const {
      parts,
      disabled,
      label,
      value,
      max: maxVal,
      permanentLabel,
      infinite,
    } = this;
    const pretty =
      infinite && permanentLabel
        ? permanentLabel
        : prettyMilliseconds(value, {
            compact: false,
            whenZero: this.whenZero || localize('none'),
          });
    return html`
      <slot></slot>

      ${label
        ? html`
            <wl-label nowrap class="label ${classMap({ raised: !!value })}">
              ${label}
            </wl-label>
          `
        : ''}
      ${permanentLabel
        ? html`
            <button
              class="infinite-toggle ${infinite ? 'infinite' : ''}"
              ?disabled=${disabled}
              @click=${this.toggleInfinite}
            >
              ∞
            </button>
          `
        : ''}
      ${renderAutoForm({
        storeOnInput: true,
        props: { ...parts, turns: parts.seconds / 3 },
        update: this.updateValue,
        fields: (props) =>
          html`
            <span class="pretty-value">${pretty}</span>

            ${timeIntervals.map((interval, index) => {
              const part = props[interval === 'seconds' ? 'turns' : interval];
              return html`
                <mwc-formfield
                  alignEnd
                  title=${part.label}
                  label=${part.label[0]!}
                >
                  ${renderNumberInput(part, {
                    min:
                      index > 0 &&
                      range(0, index).some(
                        (i) => props[timeIntervals[i]!].value > 0,
                      )
                        ? -1
                        : interval === 'seconds' &&
                          this.min === CommonInterval.Turn
                        ? 1
                        : 0,
                    max: maxVal && value === maxVal ? part.value : 999,
                    disabled:
                      disabled ||
                      !!(
                        this.max && toMilliseconds({ [interval]: 1 }) > this.max
                      ),
                  })}
                </mwc-formfield>
              `;
            })}
          `,
      })}

      <footer part="footer"></footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'time-field': TimeField;
  }
}
