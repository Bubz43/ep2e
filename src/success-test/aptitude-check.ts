import { AptitudeType } from "@src/data-enums";
import type { Ego } from "@src/entities/actor/ego";
import { stringID } from "@src/features/feature-helpers";
import { debounce } from "@src/utility/decorators";

export type AptitudeCheckInit = {
  ego: Ego;
  aptitude?: AptitudeType;
}

const eventKey = `aptitude-check-${stringID()}`

export class AptitudeCheck extends EventTarget {
  readonly ego
  readonly state: {
    aptitude: AptitudeType;
    halve: boolean
  }
  
  constructor({ ego, aptitude }: AptitudeCheckInit) {
    super();
    this.ego = ego;
    this.state = this.createNotifying({
      aptitude: aptitude || AptitudeType.Willpower,
      halve: false
    })
  }

  updateState(newState: Partial<AptitudeCheck["state"]>) {
    Object.assign(this.state, newState)
  }

  subscribe(cb: (test: this) => void) {
    const handler = () => cb(this)
    this.addEventListener(eventKey, handler);
    return () => this.removeEventListener(eventKey, handler)
  }

  @debounce(1)
  private notify() {
    this.dispatchEvent(new CustomEvent(eventKey))
  }

  private createNotifying<T extends { [key: string]: unknown }>(obj: T) {
    return new Proxy(
      { ...obj },
      {
        set: (obj, prop, value) => {
          const set = Reflect.set(obj, prop, value);
          this.notify();
          return set;
        },
      }
    );
  }
}