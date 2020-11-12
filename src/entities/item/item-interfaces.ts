export interface Attacker<Data, Full> {
  readonly attacks: { primary: Full, secondary?: Full | null }
  setupAttack(data: Data, defaultLabel: string): Full
}