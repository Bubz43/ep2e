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
import { UpdateStore } from '@src/entities/update-store';
import {
  ActionSubtype,
  ActiveTaskAction,
  createActiveTask,
  TaskState,
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
  refreshAvailable,
} from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { nonNegative, notEmpty } from '@src/utility/helpers';
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

  private async refreshAllReady() {
    const { ego, equippedGroups, updater } = this.character;
    await updater.batchCommits(async () => {
      await ego.refreshReps(), await this.character.refreshRecharges();
    });
    const fakeIdUpdaters = equippedGroups.fakeIDs.flatMap((fake) => {
      fake.storeRepRefresh();
      return fake.updater.isEmpty ? [] : fake.updater;
    });
    if (notEmpty(fakeIdUpdaters)) {
      this.character.itemOperations.update(
        ...UpdateStore.prepUpdateMany(fakeIdUpdaters),
      );
    }
  }

  render() {
    return html`
      <character-view-drawer-heading
        >${localize('time')}
        ${localize('controls')}</character-view-drawer-heading
      >

      ${[
        this.renderTaskActions(),
        this.renderTemporaryFeatures(),
        this.renderTemporaryServices(),
        this.renderRefreshTimers(),
      ]}
    `;
  }

  private renderTaskActions() {
    const { tasks } = this.character;
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

  private renderTask = (task: Character['tasks'][number]) => {
    const { completed, remaining, progress, indefinite } = task.state;
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
              renderTimeField(
                {
                  ...advance,
                  label: `${localize('spend')} ${localize('time')}`,
                },
                {
                  min: 0,
                  max: Math.min(remaining, this.character.accumulatedTime),
                },
              ),
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

  private renderTemporaryFeatures() {
    const { temporaryFeatures } = this.character;
    if (temporaryFeatures.length === 0) return '';
    return html`
      <section class="temporary-features">
        <sl-header
          heading=${localize('ongoing')}
          itemCount=${temporaryFeatures.length}
        ></sl-header>

        <sl-animated-list>
          ${repeat(temporaryFeatures, idProp, (feature) => {
            const elapsed = getElapsedTime(feature.startTime);
            const done = elapsed >= feature.duration;
            return html`
              <li>
                <span class="name">
                  ${done
                    ? html`
                        <span class="ready">${localize('completed')}</span>
                      `
                    : ''}
                  ${feature.name}
                  ${!done
                    ? html`
                        <span class="remaining"
                          >${prettyMilliseconds(
                            nonNegative(feature.duration - elapsed),
                          )}</span
                        >
                      `
                    : ''}
                </span>
                <mwc-linear-progress
                  progress=${elapsed / feature.duration}
                ></mwc-linear-progress>
              </li>
            `;
          })}
        </sl-animated-list>
      </section>
    `;
  }

  private renderTemporaryServices() {
    const { temporaryServices } = this.character.equippedGroups;
    if (temporaryServices.length === 0) return '';
    return html`
      <section class="services">
        <sl-header
          heading="${localize('temporary')} ${localize('services')}"
          itemCount=${temporaryServices.length}
          ?hideBorder=${temporaryServices.length === 0}
        >
        </sl-header>
        <sl-animated-list class="temporary-services" transformOrigin="bottom">
          ${repeat(temporaryServices, idProp, (service) => {
            const { isExpired } = service;
            return html`
              <li>
                <span class="name"
                  >${isExpired
                    ? html`<span class="expired"
                        >[${localize('expired')}]</span
                      >`
                    : ''}
                  ${service.fullName}
                  ${isExpired
                    ? ''
                    : html`
                        <span class="remaining"
                          >${prettyMilliseconds(service.remainingDuration)}
                          ${localize('remaining').toLocaleLowerCase()}</span
                        >
                      `}
                </span>

                <mwc-linear-progress
                  progress=${service.expirationProgress}
                ></mwc-linear-progress>
              </li>
            `;
          })}
        </sl-animated-list>
      </section>
    `;
  }

  private renderRefreshTimers() {
    const { timers } = this.character;

    return html`
      <section class="refresh-timers">
        <sl-header
          heading="${localize('refresh')} ${localize('timers')}"
          itemCount=${timers.length}
          ?hideBorder=${timers.length === 0}
        >
          ${timers.some(refreshAvailable)
            ? html`
                <mwc-button
                  ?disabled=${this.character.disabled}
                  slot="action"
                  icon="refresh"
                  dense
                  @click=${this.refreshAllReady}
                  label="${localize('refresh')} ${localize('all')} ${localize(
                    'ready',
                  )}"
                ></mwc-button>
              `
            : ''}
        </sl-header>
        <sl-animated-list>
          ${repeat(
            timers,
            idProp,
            (timer) => html`
              <character-view-time-item
                .timer=${timer}
              ></character-view-time-item>
            `,
          )}
        </sl-animated-list>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-time': CharacterViewTime;
  }
}
