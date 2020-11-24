import {
  renderNumberField,
  renderSelectField,
  renderTextField,
  renderTimeField,
} from '@src/components/field/fields';
import { renderAutoForm, renderSubmitForm } from '@src/components/form/forms';
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import { enumValues } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import {
  ActionSubtype,
  ActiveTaskAction,
  createActiveTask,
  taskState,
} from '@src/features/actions';
import {
  addUpdateRemoveFeature,
  idProp,
  StringID,
} from '@src/features/feature-helpers';
import {
  currentWorldTimeMS,
  getElapsedTime,
  prettyMilliseconds,
} from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { repeat } from 'lit-html/directives/repeat';
import mix from 'mix-with/lib';
import { createPipe, pathOr } from 'remeda';
import styles from './character-view-time.scss';

@customElement('character-view-time')
export class CharacterViewTime extends mix(LitElement).with(UseWorldTime) {
  static get is() {
    return 'character-view-time' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  @internalProperty() private taskCreator = false;

  private readonly expandedTasks = new Set<string>();

  private toggleExpandedTask(taskId: string) {
    if (this.expandedTasks.has(taskId)) this.expandedTasks.delete(taskId);
    else this.expandedTasks.add(taskId);
    this.requestUpdate();
  }

  private toggleTaskCreator() {
    this.taskCreator = !this.taskCreator;
  }

  private readonly taskOps = addUpdateRemoveFeature(
    () => this.character.updater.prop('data', 'tasks').commit,
  );

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
    const { accumulatedTimeStart, tasks } = this.character.epData;
    return html`
      <section class="task-actions">
        <sl-header heading=${localize('tasks')} itomCount=${tasks.length}>
          <mwc-icon-button
            @click=${this.toggleTaskCreator}
            ?disabled=${this.character.disabled}
            slot="action"
            icon="add_task"
            data-tooltip="${localize('add')} ${localize('task')}"
            @mouseover=${tooltip.fromData}
            @focus=${tooltip.fromData}
            class="task-creator-toggle ${classMap({
              active: this.taskCreator,
            })}"
          ></mwc-icon-button>
        </sl-header>

        ${this.renderAccumulated()}
        ${this.taskCreator ? this.renderTaskCreator() : ''}

        <sl-animated-list transformOrigin="bottom">
          ${repeat(tasks, idProp, this.renderTask)}
        </sl-animated-list>
      </section>
    `;
  }

  private renderAccumulated() {
    const { accumulatedTimeStart } = this.character.epData;
    const { disabled, accumulatedTime } = this.character;
    return html`
      <div class="accumulated">
        ${renderAutoForm({
          props: { accumulatedTime },
          update: createPipe(
            pathOr(['accumulatedTime'], 0),
            getElapsedTime,
            this.character.updater.prop('data', 'accumulatedTimeStart').commit,
          ),
          fields: ({ accumulatedTime }) =>
            renderTimeField(
              {
                ...accumulatedTime,
                label: `${localize('accumulated')} ${localize('downtime')}`,
              },
              { min: 0 },
            ),
        })}
        ${accumulatedTimeStart > currentWorldTimeMS()
          ? html`
              <mwc-icon-button
                icon="sync_problem"
                @click=${() =>
                  this.character.updater
                    .prop('data', 'accumulatedTimeStart')
                    .commit(currentWorldTimeMS)}
                ?disabled=${disabled}
              ></mwc-icon-button>
            `
          : ''}
      </div>
    `;
  }

  private renderTask = (task: StringID<ActiveTaskAction>) => {
    const { completed, remaining, progress, indefinite } = taskState(task);
    return html` <li>
      <button
        class="name"
        ?disabled=${indefinite}
        @click=${() => this.toggleExpandedTask(task.id)}
      >
        ${completed
          ? html`<span class="ready">[${localize('complete')}]</span>`
          : ''}
        ${task.name} (${localize(task.actionSubtype)})
        ${!completed
          ? html`<span class="remaining"
              >${prettyMilliseconds(remaining)}
              ${indefinite ? '' : localize('remaining')}</span
            >`
          : ''}
      </button>
      ${completed
        ? html` <mwc-icon-button
            icon="done"
            @click=${this.taskOps.removeCallback(task.id)}
          ></mwc-icon-button>`
        : html`
            <delete-button
              @click=${this.taskOps.removeCallback(task.id)}
            ></delete-button>
          `}
      ${indefinite
        ? ''
        : html`<mwc-linear-progress
            progress=${progress}
          ></mwc-linear-progress>`}
      ${this.expandedTasks.has(task.id)
        ? renderSubmitForm({
            classes: 'advance-form',
            props: { advance: 0, multiplier: 1 },
            update: ({ advance = 0, multiplier = 1 }) => {
              const { accumulatedTime } = this.character;
              this.character.updater
                .prop('data', 'accumulatedTimeStart')
                .store(getElapsedTime(accumulatedTime - advance));
              this.taskOps.update(
                { timeTaken: task.timeTaken + advance * multiplier },
                task,
              );
            },
            fields: ({ advance, multiplier }) => [
              renderTimeField({...advance, label: `${localize("spend")} ${localize("time")}`}, {
                min: 0,
                max: Math.min(remaining, this.character.accumulatedTime),
              }),
              renderNumberField(multiplier, { min: 1 }),
            ],
          })
        : ''}
    </li>`;
  };

  private renderTaskCreator() {
    return html`
      <fieldset class="task-creator">
        <legend>${localize('new')} ${localize('task')}</legend>
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
                timeToComplete: timeframe,
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
      </fieldset>
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