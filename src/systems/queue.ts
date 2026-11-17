// The café line IS a queue: first in, first out. This is the exact code the BUILDS #004 reel shows.
export class Queue<T> {
  private items: T[] = []
  private head = 0 // index of the front; moving it is O(1), no shifting the whole array

  enqueue(item: T) { this.items.push(item) }          // join at the back
  dequeue(): T | undefined {                           // leave from the front
    if (this.head >= this.items.length) return undefined
    const item = this.items[this.head++]
    if (this.head > 32 && this.head * 2 > this.items.length) { this.items = this.items.slice(this.head); this.head = 0 }
    return item
  }
  peek(): T | undefined { return this.items[this.head] } // who's at the front?
  get size() { return this.items.length - this.head }
  at(i: number): T | undefined { return this.items[this.head + i] } // position i in line (0 = front)
}

// A priority queue: the most urgent is served first; equal urgency keeps arrival order.
// This is the exact code the BUILDS priority-queue reel shows. (Real systems use a heap to
// make enqueue O(log n); this sorted-insert version is O(n) but much easier to read.)
export class PriorityQueue<T> {
  private items: { c: T; pri: number }[] = []

  enqueue(c: T, pri = 0) {
    let i = this.items.findIndex((x) => x.pri < pri) // first one less urgent than me
    if (i < 0) i = this.items.length                 // nobody is: go to the back
    this.items.splice(i, 0, { c, pri })              // cut in right there
  }
  dequeue(): T | undefined { return this.items.shift()?.c } // the most urgent leaves first
  peek(): T | undefined { return this.items[0]?.c }
  get size() { return this.items.length }
  at(i: number): T | undefined { return this.items[i]?.c }
  remove(c: T) { const i = this.items.findIndex((x) => x.c === c); if (i >= 0) this.items.splice(i, 1) } // someone gives up and leaves the line
}
