/**
 * Custom TypeScript Language Service Plugin
 * Filters out false positive "Text string must be rendered within <Text/>" errors
 */

function init(modules) {
  const ts = modules.typescript;

  function create(info) {
    // Get the original language service
    const proxy = Object.create(null);
    const oldLS = info.languageService;

    for (const k in oldLS) {
      proxy[k] = function () {
        return oldLS[k].apply(oldLS, arguments);
      };
    }

    // Override getSemanticDiagnostics to filter out text validation errors
    proxy.getSemanticDiagnostics = function (fileName) {
      const prior = oldLS.getSemanticDiagnostics(fileName);

      // Filter out React Native text validation errors
      return prior.filter((diagnostic) => {
        const messageText =
          typeof diagnostic.messageText === "string"
            ? diagnostic.messageText
            : diagnostic.messageText?.messageText || "";

        // Filter out the specific error message
        return !messageText.includes("must be rendered within a <Text/>");
      });
    };

    return proxy;
  }

  return { create };
}

module.exports = init;
