import {
  CharacterPoint,
  enumValues,
  CharacterDetail,
  Fork,
} from '@src/data-enums';
import type { StringID } from '@src/features/feature-helpers';
import {
  RepNetwork,
  RepWithIdentifier,
  repRefreshTimerActive,
} from '@src/features/reputations';
import {
  SkillType,
  FullSkill,
  FullFieldSkill,
  Skill,
  isFieldSkill,
  FieldSkillType,
  setupFullSkill,
  FieldSkillData,
  fieldSkillName,
  setupFullFieldSkill,
  FieldSkillIdentifier,
} from '@src/features/skills';
import {
  CommonInterval,
  refreshAvailable,
  RefreshTimer,
} from '@src/features/time';
import { localize } from '@src/foundry/localization';
import type { EgoData, CommonDetails } from '@src/foundry/template-schema';
import { HealthType } from '@src/health/health';
import { MentalHealth } from '@src/health/mental-health';
import { groupBy, compact, map } from 'remeda';
import type { ReadonlyAppliedEffects } from '../applied-effects';
import { ItemType } from '../entity-types';
import type { ItemEP, ItemProxy } from '../item/item';
import type { UpdateStore } from '../update-store';
import type { ActorEP } from './actor';

export type FullEgoData = {
  _id: string;
  name: string;
  img: string;
  data: EgoData & CommonDetails;
};

export class Ego {
  readonly data;
  readonly updater;
  readonly activeEffects;
  readonly disabled;
  readonly actor;
  readonly items;
  constructor({
    data,
    updater,
    activeEffects,
    disabled,
    actor,
    items,
  }: {
    data: FullEgoData;
    updater: UpdateStore<FullEgoData>;
    activeEffects: ReadonlyAppliedEffects;
    disabled: boolean;
    actor: ActorEP | null;
    items: Collection<ItemEP>;
  }) {
    this.data = data;
    this.updater = updater;
    this.activeEffects = activeEffects;
    this.disabled = disabled;
    this.actor = actor;
    this.items = items;
  }

  static formatPoint(point: CharacterPoint) {
    return point === CharacterPoint.Credits
      ? localize('credits')
      : `${localize(point)[0]}${localize('points')[0]}`.toLocaleUpperCase();
  }

  private readonly commonSkills = new Map<SkillType, FullSkill>();
  private readonly fieldSkills = new Map<string, FullFieldSkill>();
  private readonly repMap = new Map<
    RepNetwork,
    RepWithIdentifier & { track: boolean }
  >();

  #skills?: Skill[];
  #filteredSkills?: Skill[];
  #mentalHealth?: MentalHealth | null;
  #groupedSkills?: Partial<Record<'active' | 'know', Skill[]>>;

  get epData() {
    return this.data.data;
  }

  get aptitudes() {
    return this.epData.aptitudes;
  }

  get baseInitiative() {
    const { ref, int } = this.aptitudes;
    return parseFloat(((ref + int) / 5).toFixed(1));
  }

  get motivations() {
    return this.epData.motivations;
  }

  get settings() {
    return this.epData.settings;
  }

  get name() {
    return this.data.name;
  }

  get flex() {
    return this.epData.flex;
  }

  get mentalHealth() {
    if (this.#mentalHealth === undefined) {
      this.#mentalHealth = this.setupMentalHealth();
    }

    return this.#mentalHealth;
  }

  get skills() {
    if (!this.#filteredSkills) {
      const { canDefault } = this.settings;
      const skills = this.setupSkills();
      this.#filteredSkills = canDefault
        ? skills
        : skills.filter((s) => s.points);
    }
    return this.#filteredSkills;
  }

  get groupedSkills() {
    if (!this.#groupedSkills) {
      this.#groupedSkills = groupBy(this.skills, (skill) =>
        isFieldSkill(skill) && skill.fieldSkill === FieldSkillType.Know
          ? 'know'
          : 'active',
      ) as Partial<Record<'active' | 'know', Skill[]>>;
    }
    return this.#groupedSkills;
  }

  get reps() {
    const networks = enumValues(RepNetwork);
    if (this.repMap.size !== networks.length) {
      for (const network of networks) this.getRep(network);
    }
    return this.repMap;
  }

  get trackedReps() {
    return [...this.reps.values()].filter((rep) => rep.track);
  }

  get egoType() {
    return this.epData.egoType;
  }

  get forkStatus() {
    return this.epData.forkType;
  }

  get stressTestValue() {
    return this.epData.threatDetails.stress;
  }

  get activeForks() {
    return this.epData.activeForks;
  }

  get backups() {
    return this.epData.backups;
  }

  get useCP() {
    return !!this.epData.points.customization;
  }

  get points(): { label: string; value: number }[] {
    const groups: { label: string; value: number }[] = [];
    if (!this.epData.settings.trackPoints) return groups;

    const { points } = this.epData;
    for (const point of enumValues(CharacterPoint)) {
      const value = points[point];
      if (value || point === CharacterPoint.Rez) {
        groups.push({
          label: Ego.formatPoint(point),
          value,
        });
      }
    }
    if (groups.length === 1) {
      groups[0].label = `${localize('rez')} ${localize('points')}`;
    }
    return groups;
  }

  get details() {
    const { settings, epData } = this;
    const { characterDetails, threatDetails } = epData;
    const details: { label: string; value: string }[] = [];

    if (settings.characterDetails) {
      for (const detail of enumValues(CharacterDetail)) {
        const value = characterDetails[detail];
        if (value) details.push({ label: localize(detail), value });
      }
    }

    if (settings.threatDetails) {
      const { niche, numbers, level, stress } = threatDetails;
      if (niche) details.push({ label: localize('niche'), value: niche });
      if (numbers) details.push({ label: localize('numbers'), value: numbers });
      details.push({ label: localize('threatLevel'), value: localize(level) });
      if (stress.sv) {
        const { minHalve, minSV, notes, sv } = stress;
        details.push({
          label: `${localize('stressTest')} ${notes ? `(${notes})` : ''}`,
          value: compact([sv, minHalve ? localize('half') : minSV]).join('/'),
        });
      }
    }

    return details;
  }

  setForkType(type: Fork | '') {
    return this.updater.prop('data', 'forkType').commit(type);
  }

  getCommonSkill(skill: SkillType) {
    let fullSkill = this.commonSkills.get(skill);
    if (!fullSkill) {
      fullSkill = setupFullSkill(
        { skill, ...this.epData.skills[skill] },
        this.aptitudes,
      );
      this.commonSkills.set(skill, fullSkill);
    }
    return fullSkill;
  }

  getFieldSkill(
    {
      fieldSkill,
      id,
      ...data
    }: StringID<FieldSkillData> & { fieldSkill: FieldSkillType },
    { skipCheck = false } = {},
  ) {
    let fullSkill = skipCheck
      ? undefined
      : this.fieldSkills.get(
          `${fieldSkillName({ fieldSkill, field: data.field })}-${id}`,
        );

    if (!fullSkill) {
      fullSkill = setupFullFieldSkill({ fieldSkill, ...data }, this.aptitudes);
      this.fieldSkills
        .set(fullSkill.name, fullSkill)
        .set(`${fullSkill.name}-${id}`, fullSkill);
    }
    return fullSkill;
  }

  findFieldSkill(ids: FieldSkillIdentifier) {
    let fullSkill = this.fieldSkills.get(fieldSkillName(ids));
    if (!fullSkill) {
      const { field, fieldSkill } = ids;
      const existing = this.epData.fieldSkills[ids.fieldSkill].find(
        (f) => f.field.toLocaleLowerCase() === field.toLocaleLowerCase(),
      );
      if (existing)
        fullSkill = this.getFieldSkill(
          { fieldSkill, ...existing },
          { skipCheck: true },
        );
    }
    return fullSkill;
  }

  getRep(network: RepNetwork) {
    let rep = this.repMap.get(network);
    if (!rep) {
      rep = {
        acronym: localize(network),
        network: localize('FULL', network),
        ...this.epData.reps[network],
        identifier: { networkId: network },
      };
      this.repMap.set(network, rep);
    }
    return rep;
  }

  get repRefreshTimers() {
    const timers: RefreshTimer[] = [];
    for (const rep of this.reps.values()) {
      if (repRefreshTimerActive(rep)) {
        timers.push({
          label: `${rep.acronym} ${localize('SHORT', 'minor')}/${localize(
            'SHORT',
            'moderate',
          )} ${localize('refresh')}`,
          elapsed: rep.refreshTimer,
          max: CommonInterval.Week,
          id: rep.network,
        });
      }
    }
    return timers;
  }

  get timers() {
    return this.repRefreshTimers;
  }

  refreshReps() {
    if (this.repRefreshTimers.some(refreshAvailable)) {
      for (const network of enumValues(RepNetwork)) {
        this.updater
          .prop('data', 'reps', network)
          .store((rep) =>
            rep.refreshTimer >= CommonInterval.Week
              ? { ...rep, refreshTimer: 0, minor: 0, moderate: 0 }
              : rep,
          );
      }
    }

    return this.updater;
  }

  advanceRepTimers(advance: number) {
    for (const network of enumValues(RepNetwork)) {
      this.updater
        .prop('data', 'reps', network)
        .store((rep) =>
          repRefreshTimerActive(rep)
            ? { ...rep, refreshTimer: rep.refreshTimer + advance }
            : rep,
        );
    }
  }

  private setupSkills() {
    if (this.#skills) return this.#skills;

    const { fieldSkills } = this.epData;
    const skills: Skill[] = [];

    for (const skill of enumValues(SkillType)) {
      skills.push(this.getCommonSkill(skill));
    }

    for (const fieldSkill of enumValues(FieldSkillType)) {
      const fields = fieldSkills[fieldSkill];
      for (const field of fields) {
        skills.push(
          this.getFieldSkill({ ...field, fieldSkill }, { skipCheck: true }),
        );
      }
    }

    // TODO: Skills from effects and dups overwriting with higher total

    this.#skills = skills.sort((a, b) => a.name.localeCompare(b.name));
    return this.#skills;
  }

  private setupMentalHealth() {
    return this.settings.trackMentalHealth
      ? new MentalHealth({
          data: this.epData.mentalHealth,
          statMods: this.activeEffects.getHealthStatMods(HealthType.Mental),
          willpower: this.aptitudes.wil,
          updater: this.updater.prop('data', 'mentalHealth').nestedStore(),
          source: this.name,
        })
      : null;
  }

  acceptItemAgent(agent: ItemProxy) {
    if (Ego.egoItems.includes(agent.type)) {
      return { accept: true } as const;
    }
    return {
      accept: false,
      override: false,
      rejectReason: `Ego can only accept [${map(Ego.egoItems, localize).join(
        ', ',
      )}] items.`,
    } as const;
  }
  static readonly egoItems = [ItemType.Psi, ItemType.Sleight, ItemType.Trait];
}
