import { TraitSource, TraitType, CharacterPoint } from "@src/data-enums";
import { localize } from "@src/foundry/localization";
import { notEmpty, toggle } from "@src/utility/helpers";
import { clamp, compact } from "remeda";
import type { ItemType } from "../entity-types";
import { ItemProxyBase, ItemProxyInit } from "./item-proxy-base";

export class Trait extends ItemProxyBase<ItemType.Trait> {
  readonly lockSource;

  constructor({
    lockSource,
    ...init
  }: ItemProxyInit<ItemType.Trait> & { lockSource: boolean }) {
    super(init);
    this.lockSource = lockSource;
  }

  getTextInfo() {
    const {
      traitType,
      currentSource,
      triggers,
      // activeEffects,
      triggered,
    } = this;
    const triggerList = triggers ? `${localize("triggers")}: ${triggers}` : "";

    return [
      triggered ? "" : triggerList,
      // ...map(activeEffects?.effects || [], formatEffect),
      localize(traitType),
      localize(currentSource),
      triggered ? triggerList : "",
    ];
  }

  get tags() {
    const { traitType, subtype, restrictions, triggers, triggered } = this;
    return compact([
      localize(traitType),
      this.source,
      triggered ? localize("triggered") : "",
      subtype,
      ...restrictions.split(","),
      ...triggers.split(","),
    ]);
  }

  toggleTriggered() {
    return this.updater.prop("data", "state", "triggered").commit(toggle);
  }

  updateLevel(levelIndex: number) {
    return this.updater.prop("data", "state", "level").commit(levelIndex);
  }


  get fullType() {
    return `${localize(this.source)} ${localize(this.type)}`;
  }

  get traitType() {
    return this.epData.traitType;
  }

  get restrictions() {
    return this.epData.restrictions;
  }

  get currentSource() {
    return this.epData.source;
  }

  get hasMultipleLevels() {
    return this.levels.length > 1;
  }

  get isMorphTrait() {
    return this.currentSource === TraitSource.Morph;
  }

  get levels() {
    return this.epData.levels;
  }

  get levelIndex() {
    return clamp(this.state.level, this.levelRange);
  }

  get levelInfo() {
    return this.levels[this.levelIndex] || this.levels[0];
  }

  get isPositive() {
    return this.traitType === TraitType.Positive;
  }

  get isNegative() {
    return this.traitType === TraitType.Negative
  }

  get levelRange() {
    return { min: 0, max: this.levels.length - 1 };
  }

  get subtype() {
    return this.epData.subtype;
  }

  get triggers() {
    return this.epData.triggers;
  }

  get hasTriggers() {
    return !!this.triggers;
  }

  get triggered() {
    return this.hasTriggers && this.embedded && this.state.triggered;
  }

  get source() {
    return this.epData.source;
  }

  get state() {
    return this.epData.state;
  }

  get isTemporary() {
    return !!this.epFlags?.temporary;
  }

  get fullName() {
    const { levelIndex, subtype, triggered, embedded, levels } = this;
    const parts = compact([
      subtype,
      levels.length > 1 && embedded && `${localize("level")} ${levelIndex + 1}`,
    ]);

    return [
      triggered ? `[${localize("triggered")}]` : "",
      this.name,
      notEmpty(parts) ? `(${parts.join(", ")})` : "",
    ]
      .join(" ")
      .trim();
  }

  // get activeEffects(): AddEffects | null {
  //   const { levelInfo, triggered, hasTriggers } = this;
  //   if (hasTriggers && !triggered) return null;
  //   return {
  //     source: this.fullName,
  //     effects: levelInfo.effects,
  //   };
  // }

  get costType() {
    return this.source === TraitSource.Morph
      ? CharacterPoint.Morph
      : CharacterPoint.Customization;
  }

  get costLabel() {
    return localize(this.isPositive ? "cost" : "bonus");
  }

}