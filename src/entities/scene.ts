import { EP } from "@src/foundry/system"

export class SceneEP extends Scene {
  get epFlags() {
    return this.data.flags[EP.Name]
  }
}
