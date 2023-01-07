const persistentTypes = new WeakMap<object, string[]>;

export function persistent() {
  return (target: Object, propertyKey: string) => {
    if(persistentTypes.has(target)) {
      persistentTypes.get(target)!.push(propertyKey);
    } else {
      persistentTypes.set(target, [propertyKey]);
    }
  }
}

export function serialize(thing: Object) {
  let nextId = 0;
  const ids = new Map<object, number>();

  function replacer(_key: string, value: any) {
    if(!value?.constructor?.prototype) return value;
    if(ids.has(value)) return {'@ref': ids.get(value)!};
    const persistentKeys = persistentTypes.get(value.constructor.prototype);
    if(!persistentKeys) return value;
    ids.set(value, ++nextId);
    return Object.fromEntries([
      ['@id', ids.get(value)],
      ['@type', value.constructor.name],
      ...persistentKeys.map(k => [k, value[k]]), 
    ]);
  }
  return JSON.stringify(thing, replacer, 2);
}
