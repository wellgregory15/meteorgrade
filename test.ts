const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const convertKeys = (obj: any, converter: (s: string) => string): any => {
  if (typeof obj !== 'object' || obj === null || obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(item => convertKeys(item, converter));
  return Object.keys(obj).reduce((acc: any, key) => {
    acc[converter(key)] = convertKeys(obj[key], converter);
    return acc;
  }, {});
};

console.log(convertKeys({ createdAt: 'hi' }, toSnakeCase));
