import { renderTimeField } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import {
  defaultStandardCalendar,
  getCurrentDateTime,
} from '@src/features/calendar';
import { parseMilliseconds } from '@src/features/modify-milliseconds';
import { advanceWorldTime } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { userCan } from '@src/foundry/misc-helpers';
import { addEPSocketHandler } from '@src/foundry/socket';
import { customElement, html, LitElement, state } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import mix from 'mix-with/lib';
import styles from './world-time-controls.scss';

const formatTime = (value: number) => `${value < 10 ? 0 : ''}${value}`;

@customElement('world-time-controls')
export class WorldTimeControls extends mix(LitElement).with(UseWorldTime) {
  static get is() {
    return 'world-time-controls' as const;
  }

  static styles = [styles];

  @state() private timeChange = 0;

  @state() private changes: [number, string][] = [];

  firstUpdated() {
    addEPSocketHandler('worldTimeChange', (change) => {
      this.changes = [...this.changes.slice(-3), change];
    });
  }

  private modifyTime(forwards: boolean) {
    this.timeChange && advanceWorldTime(this.timeChange * (forwards ? 1 : -1));
    this.timeChange = 0;
  }

  private advanceTime() {
    this.modifyTime(true);
  }

  private reverseTime() {
    this.modifyTime(false);
  }

  render() {
    const disabled = this.timeChange === 0;
    const currentDate = getCurrentDateTime(defaultStandardCalendar());
    // console.log(prettyMilliseconds(currentWorldTimeMS()));
    const { hours, minutes, seconds } = parseMilliseconds(currentDate.time);
    return html`
      <div class="date-time">
        <span class="time"
          ><span title=${localize('hours')}>${formatTime(hours)}</span>:<span
            title=${localize('minutes')}
            >${formatTime(minutes)}</span
          >:<span title=${localize('seconds')}
            >${formatTime(seconds)}</span
          ></span
        >
        <span class="date">
          ${currentDate.month} ${currentDate.day}, ${currentDate.era}
          ${currentDate.year}
        </span>
      </div>
      ${game.user.isGM && userCan('SETTINGS_MODIFY')
        ? html`<div class="controls">
            <mwc-icon-button
              ?disabled=${disabled}
              icon="fast_rewind"
              @click=${this.reverseTime}
            >
            </mwc-icon-button>
            ${renderAutoForm({
              noDebounce: true,
              props: { change: this.timeChange },
              update: ({ change }) => {
                if (change !== undefined) this.timeChange = change;
              },
              fields: ({ change }) =>
                renderTimeField(
                  { ...change, label: '' },
                  { whenZero: `${localize('modify')} ${localize('time')}` },
                ),
            })}
            <mwc-icon-button
              ?disabled=${disabled}
              icon="fast_forward"
              @click=${this.advanceTime}
            >
            </mwc-icon-button>
          </div>`
        : ''}

      <sl-animated-list class="changes" fadeOnly animationDuration="400">
        ${repeat(
          this.changes,
          ([date]) => date,
          ([_, change]) => html`<li>${change}</li>`,
        )}
      </sl-animated-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'world-time-controls': WorldTimeControls;
  }
}
