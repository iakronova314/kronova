export class Decimal {
  readonly coefficient: bigint
  readonly scale: number

  private constructor(coefficient: bigint, scale: number) {
    this.coefficient = coefficient
    this.scale = scale
  }

  static parse(value: string): Decimal | null {
    const match = value.trim().match(/^(-?)(\d+)(?:\.(\d+))?$/)
    if (!match) return null
    const fraction = match[3] ?? ''
    const coefficient = BigInt(`${match[1]}${match[2]}${fraction}`)
    return new Decimal(coefficient, fraction.length)
  }

  static zero() { return new Decimal(BigInt(0), 0) }

  private align(other: Decimal): [bigint, bigint, number] {
    const scale = Math.max(this.scale, other.scale)
    return [this.coefficient * BigInt(10) ** BigInt(scale - this.scale), other.coefficient * BigInt(10) ** BigInt(scale - other.scale), scale]
  }

  add(other: Decimal) { const [left, right, scale] = this.align(other); return new Decimal(left + right, scale) }
  subtract(other: Decimal) { const [left, right, scale] = this.align(other); return new Decimal(left - right, scale) }
  multiply(other: Decimal) { return new Decimal(this.coefficient * other.coefficient, this.scale + other.scale) }
  percent(rate: Decimal) { return new Decimal(this.coefficient * rate.coefficient, this.scale + rate.scale + 2) }
  abs() { return new Decimal(this.coefficient < BigInt(0) ? -this.coefficient : this.coefficient, this.scale) }
  greaterThan(other: Decimal) { const [left, right] = this.align(other); return left > right }

  toString(): string {
    const negative = this.coefficient < BigInt(0)
    const digits = (negative ? -this.coefficient : this.coefficient).toString().padStart(this.scale + 1, '0')
    const result = this.scale ? `${digits.slice(0, -this.scale)}.${digits.slice(-this.scale)}` : digits
    return negative ? `-${result}` : result
  }
}
