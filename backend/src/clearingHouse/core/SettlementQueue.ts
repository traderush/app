import { SettlementInstruction, SettlementQueue } from './types';

export class InMemorySettlementQueue implements SettlementQueue {
  private readonly queue: SettlementInstruction[] = [];

  enqueue(instruction: SettlementInstruction): void {
    this.queue.push(instruction);
    this.queue.sort((a, b) => a.clockSeq - b.clockSeq);
  }

  dequeue(): SettlementInstruction | undefined {
    return this.queue.shift();
  }

  peek(): SettlementInstruction | undefined {
    return this.queue[0];
  }

  size(): number {
    return this.queue.length;
  }
}
