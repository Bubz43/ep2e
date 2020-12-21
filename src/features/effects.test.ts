import { extractDurationEffectMultipliers } from "./effects"
import { expect } from '@esm-bundle/chai';


describe(extractDurationEffectMultipliers.name, () => {
  it("errors without args", () => {
    //@ts-expect-error
    expect(extractDurationEffectMultipliers()).to.throw()
  })
})