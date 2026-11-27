// Operators (tokens with `userLogin`) may call every protected route.
// Readers (tokens with `cpfUser`) get a read-only view of the catalog plus
// their own profile and loans; everything else answers 403.
const readerRules = [
  { method: "GET", path: /^\/book(?:\/\d+)?$/ },
  { method: "GET", path: /^\/library(?:\/\d+)?$/ },
  { method: "GET", path: /^\/bookLibrary(?:\/\d+)?$/ },
  {
    method: "GET",
    path: /^\/report\/(?:getBookCatalog|getAvailableBooks|getBooksByCategory|getBookAvailability\/\d+)$/,
  },
  {
    method: "GET",
    path: /^\/report\/getUserLoans\/([^/]+)$/,
    owns: (session, match) => match[1] === session.cpfUser,
  },
  {
    method: "GET",
    path: /^\/user\/([^/]+)$/,
    owns: (session, match) => match[1] === session.cpfUser,
  },
  {
    method: "POST",
    path: /^\/loan$/,
    owns: (session, _match, req) => req.body?.cpfUser === session.cpfUser,
  },
];

function roleOf(session = {}) {
  if (session.userLogin) return "operator";
  if (session.cpfUser) return "reader";
  return null;
}

function authorize(req, res, next) {
  const role = roleOf(req.session);
  if (role === "operator") return next();

  if (role === "reader") {
    const allowed = readerRules.some((rule) => {
      if (rule.method !== req.method) return false;
      const match = rule.path.exec(req.path);
      return Boolean(match) && (!rule.owns || rule.owns(req.session, match, req));
    });
    if (allowed) return next();
  }

  return res
    .status(403)
    .json({ message: "You do not have permission to access this resource." });
}

module.exports = authorize;
module.exports.roleOf = roleOf;
