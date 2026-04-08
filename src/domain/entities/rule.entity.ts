// Domain Entity: Rule
// Classification rule that matches transaction descriptions

export interface RuleProps {
  id?: number;
  userId: number;
  keyword: string;
  categoryId: number;
  merchantName?: string | null;
  priority: number;
}

export class Rule {
  readonly id?: number;
  readonly userId: number;
  readonly keyword: string;
  readonly categoryId: number;
  readonly merchantName: string | null;
  readonly priority: number;

  private constructor(props: RuleProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.keyword = props.keyword;
    this.categoryId = props.categoryId;
    this.merchantName = props.merchantName ?? null;
    this.priority = props.priority;
  }

  static create(props: RuleProps): Rule {
    if (!props.keyword.trim()) {
      throw new Error('Rule keyword cannot be empty');
    }
    return new Rule(props);
  }

  static fromPersistence(props: RuleProps): Rule {
    return new Rule(props);
  }

  matches(description: string): boolean {
    return description.toLowerCase().includes(this.keyword.toLowerCase());
  }
}
