export type EntitySubCallbacks<
  T,
> = {
  onEntityUpdate: (entity: T) => void;
  onSubEnd?: () => void;
};

export type Subscribable<
  T,
> = Omit<EntitySubscription<T>, "updateSubscribers" | "unsubscribeAll">;
export class EntitySubscription<
  T,
> {
  #subs = new Map<object, EntitySubCallbacks<T>>();

  get subs() {
    return this.#subs as ReadonlyMap<object, EntitySubCallbacks<T>>;
  }

  subscribe(subscriber: object, callbacks: EntitySubCallbacks<T>) {
    // TODO: maybe unsubscribe if key already exists 
    this.#subs.set(subscriber, callbacks);
    return () => this.unsubscribe(subscriber);
  }

  unsubscribe(subscriber: object) {
    const callbacks = this.#subs.get(subscriber);
    const deleted = this.#subs.delete(subscriber);
    callbacks?.onSubEnd?.();
    return deleted;
  }

  hasSubscriber(subscriber: object) {
    return this.#subs.has(subscriber);
  }

  updateSubscribers(entity: T) {
    this.#subs.forEach(({ onEntityUpdate }) => onEntityUpdate(entity));
  }

  unsubscribeAll() {
    this.#subs.forEach(({ onSubEnd }, subscriber, subs) => {
      subs.delete(subscriber);
      onSubEnd?.();
    });
  }
}
