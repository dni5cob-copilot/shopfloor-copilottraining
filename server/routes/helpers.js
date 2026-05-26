// Shared pagination helper
function paginate(req) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const page_size = Math.min(200, Math.max(1, parseInt(req.query.page_size) || 50));
  return { page, page_size, offset: (page - 1) * page_size };
}

module.exports = { paginate };
