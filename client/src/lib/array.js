export function moveItem(list, from, to) {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function replaceAt(list, index, value) {
  return list.map((item, i) => (i === index ? value : item));
}

export function removeAt(list, index) {
  return list.filter((_, i) => i !== index);
}

export function insertAt(list, index, value) {
  return [...list.slice(0, index), value, ...list.slice(index)];
}
