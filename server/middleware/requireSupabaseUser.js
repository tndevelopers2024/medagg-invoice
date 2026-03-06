export const requireSupabaseUser = async (_req, res) => {
  return res.status(410).json({ error: "Supabase auth has been removed" });
};
