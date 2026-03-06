export const toPublic = (doc) => {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return {
    id: typeof _id?.toString === "function" ? _id.toString() : String(_id),
    ...rest,
  };
};
