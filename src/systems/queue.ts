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
