import {
  renderTextField,
  renderTimeField,
  renderSelectField,
} from '@src/components/field/fields';
import { renderSubmitForm } from '@src/components/form/forms';
import { enumValues } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import { ActionSubtype, createActiveTask } from '@src/features/actions';
import { addUpdateRemoveFeature, idProp } from '@src/features/feature-helpers';
import { getElapsedTime } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { openDialog } from '@src/open-dialog';
import { customElement, LitElement, property, html } from 'lit-element';
import { render } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat';
import styles from './character-view-time.scss';

@customElement('character-view-time')
export class CharacterViewTime extends LitElement {
  static get is() {
    return 'character-view-time' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  private readonly taskOps = addUpdateRemoveFeature(
    () => this.character.updater.prop('data', 'tasks').commit,
  );

  private openTaskCreator() {
    openDialog((dialog) => {
      dialog.heading = `${localize('new')} ${localize('task')}`;
      const content = html`
        ${renderSubmitForm({
          props: {
            name: '',
            timeframe: 0,
            actionSubtype: ActionSubtype.Mesh,
          },
          update: ({
            name = '',
            timeframe = 0,
            actionSubtype = ActionSubtype.Mesh,
          }) =>
            this.taskOps.add(
              {},
              createActiveTask({
                name,
                timeframe,
                actionSubtype,
                failed: false,
              }),
            ),
          fields: ({ name, timeframe, actionSubtype }) => [
            renderTextField(name, { required: true }),
            renderTimeField(timeframe, {
              permanentLabel: localize('indefinite'),
            }),
            renderSelectField(
              { ...actionSubtype, label: localize('type') },
              enumValues(ActionSubtype),
            ),
          ],
        })}
      `;
      render(content, dialog);
    });
  }

  render() {
    return html`
      <character-view-drawer-heading
        >${localize('time')}
        ${localize('controls')}</character-view-drawer-heading
      >

      ${this.renderTaskActions()}
    `;
  }

  private renderTaskActions() {
    const { accumulatedTime, tasks } = this.character.epData;

    return html`
      <section class="task-actions">
        <sl-header heading=${localize('tasks')} itomCount=${tasks.length}>
          <mwc-icon-button
            @click=${this.openTaskCreator}
            ?disabled=${this.character.disabled}
            slot="action"
            icon="add_task"
            data-tooltip="${localize('add')} ${localize('task')}"
            @mouseover=${tooltip.fromData}
            @focus=${tooltip.fromData}
          ></mwc-icon-button>
        </sl-header>

        <sl-animated-list transformOrigin="bottom">
        ${repeat(tasks, idProp, task => {
          const elapsed = getElapsedTime(task.startTime);
          
        })}
        </sl-animated-list>
      </section>
    `;
  }

  private renderTemporaryServices() {
    return html``;
  }
  private renderRefreshTimers() {}
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-time': CharacterViewTime;
  }
}
