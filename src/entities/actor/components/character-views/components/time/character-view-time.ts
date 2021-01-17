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
  createActiveTask,
  taskState,
} from '@src/features/actions';
import {
  addUpdateRemoveFeature,
  idProp,
  matchID,
} from '@src/features/feature-helpers';
import {
  currentWorldTimeMS,
  getElapsedTime,
  prettyMilliseconds,
  refreshAvailable,
} from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { RenderDialogEvent } from '@src/open-dialog';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, LitElement, property } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import mix from 'mix-with/lib';
import { createPipe, pathOr } from 'remeda';
import { substanceActivationDialog } from '../substance-activation-dialog';
import styles from './character-view-time.scss';

@customElement('character-view-time')
export class CharacterViewTime extends mix(LitElement).with(UseWorldTime) {
  static get is() {
    return 'character-view-time' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  private readonly temporaryFeatureOps = addUpdateRemoveFeature(
    () => this.character.updater.path('data', 'temporary').commit,
  );

  private readonly expandedTasks = new Set<string>();

  private toggleExpandedTask(taskId: string) {
    if (this.expandedTasks.has(taskId)) this.expandedTasks.delete(taskId);
    else this.expandedTasks.add(taskId);
    this.requestUpdate();
  }

  private openTaskCreator() {
    this.dispatchEvent(
      new RenderDialogEvent(
        html`<mwc-dialog hideActions heading="${localize('new')} ${localize(
          'task',
        )}" open
          >${this.renderTaskCreator()}
         </mwc-button>
          </mwc-dialog
        >`,
      ),
    );
  }

  private readonly taskOps = addUpdateRemoveFeature(
    () => this.character.updater.path('data', 'tasks').commit,
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

  private openSubstanceActivationDialog(id: string) {
    const substance = this.character.awaitingOnsetSubstances.find(matchID(id));
    if (!substance) return;
    if (
      notEmpty(
        Object.values(this.character.appliedEffects.substanceModifiers).flat(),
      )
    ) {
      this.dispatchEvent(
        new RenderDialogEvent(
          substanceActivationDialog(this.character, substance),
        ),
      );
    } else substance.makeActive([]);
  }

  render() {
    return html`
      <character-view-drawer-heading
        >${localize('time')}
        ${localize('controls')}</character-view-drawer-heading
      >

      ${[
        this.renderTaskActions(),
        this.renderAppliedSubstances(),
        this.renderFabricators(),
        this.renderRegens(),
        this.renderTemporaryFeatures(),
        this.renderTemporaryServices(),
        this.renderRefreshTimers(),
      ]}
    `;
  }

  private renderAppliedSubstances() {
    const {
      awaitingOnsetSubstances,
      activeSubstances,
      disabled,
    } = this.character;
    return html`
      ${notEmpty(activeSubstances)
        ? html`
            <section>
              <sl-header
                heading="${localize('active')} ${localize('substances')}"
              ></sl-header>
              <sl-animated-list class="active-substances">
                ${repeat(
                  activeSubstances,
                  idProp,
                  (substance) => html`
                    <character-view-active-substance
                      .substance=${substance}
                      .character=${this.character}
                    ></character-view-active-substance>
                  `,
                )}
              </sl-animated-list>
            </section>
          `
        : ''}
      ${notEmpty(awaitingOnsetSubstances)
        ? html`
            <section>
              <sl-header
                heading=${localize('substancesAwaitingOnset')}
              ></sl-header>
              <sl-animated-list>
                ${repeat(
                  awaitingOnsetSubstances,
                  idProp,
                  (substance) => html`
                    <time-state-item
                      ?disabled=${disabled}
                      .timeState=${substance.awaitingOnsetTimeState}
                      completion="ready"
                      .item=${substance}
                    >
                      <mwc-icon-button
                        slot="action"
                        icon="play_arrow"
                        data-tooltip=${localize('start')}
                        @mouseover=${tooltip.fromData}
                        @click=${() =>
                          this.openSubstanceActivationDialog(substance.id)}
                      ></mwc-icon-button>
                    </time-state-item>
                  `,
                )}
              </sl-animated-list>
            </section>
          `
        : ''}
    `;
  }

  private renderRegens() {
    const { regeningHealths, disabled } = this.character;
    if (regeningHealths.length === 0) return '';
    return html`
      <section>
        <sl-header
          heading="${localize('heal')}/${localize('repair')}"
        ></sl-header>
        ${regeningHealths.map((health) => {
          const { activeRecoveries, regenState } = health;
          return notEmpty(activeRecoveries) && regenState
            ? html`
                <figure class="heal-recoveries">
                  <figcaption>
                    ${health.source}
                    (${localize(`${health.type}Health` as const)},
                    ${localize(regenState)})
                  </figcaption>
                  ${[...activeRecoveries.values()].map(
                    (heal) => html`
                      <time-state-item
                        ?disabled=${disabled}
                        .timeState=${heal.timeState}
                        completion="ready"
                      >
                      </time-state-item>
                    `,
                  )}
                </figure>
              `
            : '';
        })}
      </section>
    `;
  }

  private renderTaskActions() {
    const { tasks } = this.character;
    return html`
      <section class="task-actions">
        <sl-header heading=${localize('tasks')} itemCount=${tasks.length}>
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

        ${notEmpty(tasks) ? this.renderAccumulated() : ''}

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
            this.character.updater.path('data', 'accumulatedTimeStart').commit,
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
                    .path('data', 'accumulatedTimeStart')
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
        ${task.failed ? `[${localize('failure')}]` : ''} ${task.name}
        (${localize(task.actionSubtype)})
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
              @delete=${this.taskOps.removeCallback(task.id)}
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
                .path('data', 'accumulatedTimeStart')
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
        }) => {
          this.character.updater.batchCommits(() => {
            this.taskOps.add(
              {},
              createActiveTask({
                name,
                timeframe: timeframe,
                actionSubtype,
                failed: false,
              }),
            );
            if (this.character.tasks.length === 0) {
              this.character.updater
                .path('data', 'accumulatedTimeStart')
                .commit(currentWorldTimeMS());
            }
          });
        },
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
  }

  private renderFabricators() {
    const { activeFabbers } = this.character.equippedGroups;
    if (activeFabbers.length === 0) return '';
    // TODO option to not notify on complete
    return html`
      <section>
        <sl-header
          heading=${localize('fabbersAndGlands')}
          itemCount=${activeFabbers.length}
        ></sl-header>
        <sl-animated-list>
          ${repeat(
            activeFabbers,
            idProp,
            (fabber) => html`
              <time-state-item
                ?disabled=${this.character.disabled}
                .timeState=${fabber.printState}
                completion="completed"
                .item=${fabber}
              ></time-state-item>
            `,
          )}
        </sl-animated-list>
      </section>
    `;
  }

  private renderTemporaryFeatures() {
    const { temporaryFeatures, disabled } = this.character;
    if (temporaryFeatures.length === 0) return '';
    return html`
      <section>
        <sl-header
          heading=${localize('ongoing')}
          itemCount=${temporaryFeatures.length}
        ></sl-header>

        <sl-animated-list>
          ${repeat(
            temporaryFeatures,
            idProp,
            (feature) => html`
              <time-state-item
                ?disabled=${disabled}
                .timeState=${feature.timeState}
                completion="completed"
              >
                <delete-button
                  slot="action"
                  @delete=${this.temporaryFeatureOps.removeCallback(feature.id)}
                ></delete-button>
              </time-state-item>
            `,
          )}
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
        <sl-animated-list transformOrigin="bottom">
          ${repeat(
            temporaryServices,
            idProp,
            (service) => html`
              <time-state-item
                completion="expired"
                ?disabled=${this.character.disabled}
                .timeState=${service.timeState}
                .item=${service}
              ></time-state-item>
            `,
          )}
        </sl-animated-list>
      </section>
    `;
  }

  private renderRefreshTimers() {
    const { timers, disabled } = this.character;

    return html`
      <section>
        <sl-header
          heading="${localize('refresh')} ${localize('timers')}"
          itemCount=${timers.length}
          ?hideBorder=${timers.length === 0}
        >
          ${timers.some(refreshAvailable)
            ? html`
                <mwc-button
                  ?disabled=${disabled}
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
              <time-state-item
                .timeState=${timer}
                completion="ready"
                ?disabled=${disabled}
              ></time-state-item>
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
