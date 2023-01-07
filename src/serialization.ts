const typeNames = new Map<string, Type<any>>();
const persistentTypes = new Map<object, string[]>;

export function persistent() {
  return (target: Object, propertyKey: string) => {
    typeNames.set(target.constructor.name, target.constructor as Type<any>);
    if(persistentTypes.has(target)) {
      persistentTypes.get(target)!.push(propertyKey);
    } else {
      persistentTypes.set(target, [propertyKey]);
    }
  }
}

export function deserialize(json: string): any {
  const instances = new Map<number, object>();

  function deserializeData(data: any): any {
    if(typeof data !== 'object') return data;
    if(data == null) return data;
    if(Array.isArray(data)) return data.map(deserializeData);
    if('@ref' in data) {
      const existing = instances.get(data['@ref']);
      if(!existing) throw new Error(`Couldn't find instance with id ${data['@ref']}!`);
      return existing;
    } else if('@type' in data) {
      const ctor = typeNames.get(data['@type']);
      if(!ctor) throw new Error(`I don't know how to create a ${data['@type']}!`);
      const instance = new ctor();
      if('@id' in data) {
        instances.set(data['@id'], instance);
      }
      for(const [key, value] of Object.entries(data).filter(([key]) => key !== '@type' && key !== '@id')) {
        instance[key] = deserializeData(value);
      }
      return instance;
    } else {
      const obj = Object.fromEntries(Object.entries(data).map(([key, value]) => ([key, deserializeData(value)])));
      if('@id' in data) instances.set(obj['@id'], obj);
      return obj;
    }

  }

  return deserializeData(JSON.parse(json));
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

interface Type<T> {
  new(): T;
}
