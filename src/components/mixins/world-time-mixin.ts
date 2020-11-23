import type { LitElement } from "lit-element";
import type { Class } from "type-fest";

export const UseWorldTime = (cls: Class<LitElement>) => {
  return class extends cls {
    connectedCallback() {
      Hooks.on("updateWorldTime", this._updateFromWorldTime)
      super.connectedCallback()
    }

    disconnectedCallback() {
      Hooks.off("updateWorldTime", this._updateFromWorldTime)
      super.disconnectedCallback()
    }

    private _updateFromWorldTime = () => this.requestUpdate()
  }
}