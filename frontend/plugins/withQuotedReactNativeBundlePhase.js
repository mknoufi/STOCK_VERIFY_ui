const { withXcodeProject } = require('@expo/config-plugins');

function patchBundlePhaseShellScript(shellScript) {
  if (typeof shellScript !== 'string') return shellScript;
  if (shellScript.includes('RN_XCODE_SCRIPT=')) return shellScript;
  if (!shellScript.includes('react-native-xcode.sh')) return shellScript;

  const lines = shellScript.split('\n');
  const idx = lines.findIndex(
    (line) =>
      line.includes('react-native-xcode.sh') &&
      line.includes('$NODE_BINARY') &&
      line.includes('`')
  );

  if (idx === -1) return shellScript;

  // Replace backtick-execution (breaks on paths with spaces) with a quoted variable + bash call.
  const rnXcodeScriptLine =
    "RN_XCODE_SCRIPT=\"$(\"$NODE_BINARY\" --print \"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\")\"";

  lines[idx] = rnXcodeScriptLine;
  lines.splice(idx + 1, 0, 'bash "$RN_XCODE_SCRIPT"');

  return lines.join('\n');
}

module.exports = function withQuotedReactNativeBundlePhase(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const phases = project.hash?.project?.objects?.PBXShellScriptBuildPhase;
    if (!phases) return config;

    for (const key of Object.keys(phases)) {
      const phase = phases[key];
      if (!phase || typeof phase !== 'object') continue;

      const name = typeof phase.name === 'string' ? phase.name.replace(/^"|"$/g, '') : '';
      if (name !== 'Bundle React Native code and images') continue;

      phase.shellScript = patchBundlePhaseShellScript(phase.shellScript);
    }

    return config;
  });
};
