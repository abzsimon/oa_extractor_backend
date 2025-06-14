function computeCompletionRate(article) {
  const keysToCheck = [
    "language",
    "keywords",
    "objectFocus",
    "dataTypesDiscussed",
    "discourseGenre",
    "methodology",
    "funding",
    "positionOnDataOpenAccess",
    "barriers",
    "positionOnOpenAccessAndIssues",
    "remarks",
    "selectedSubfield",
  ];

  const isFilled = val => {
    if (val === null || val === undefined) return false;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "string") return val.trim().length > 0;
    return true;
  };

  const filledCount = keysToCheck.filter(key => isFilled(article[key])).length;
  return Math.round((filledCount / keysToCheck.length) * 100);
};

module.exports = { computeCompletionRate }