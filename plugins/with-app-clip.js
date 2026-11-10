/**
 * with-app-clip — Expo config plugin that adds the Snugbug App Clip target.
 *
 * The iOS workflow runs `expo prebuild` on every build, which regenerates
 * ios/ from scratch — so a hand-added Xcode target would be wiped. This
 * plugin re-creates the App Clip target on every prebuild instead:
 *
 *   - Target "SnugbugClip", product type App Clip
 *     (com.apple.product-type.application.on-demand-install-capable)
 *   - Bundle ID com.beatrackfaminc.snugbug.SnugBug — the App ID ALREADY
 *     exists in the Developer portal ("SnugBug App Clip"). Do NOT change
 *     this ID: it must match the portal App ID exactly.
 *   - Its own AppDelegate.swift (plain React Native bridge, NO Expo
 *     modules — the clip links React + Hermes only, to stay small),
 *     Info.plist and entitlements under ios/SnugbugClip/.
 *   - Its own JS entry point, clip-entry.tsx at the repo root, bundled by
 *     the target's "Bundle React Native code and images" phase via the
 *     ENTRY_FILE build setting (the phase is a copy of the main target's
 *     Expo export:embed phase).
 *   - The main target gets an "Embed App Clips" phase + a dependency on
 *     the clip target, so `xcodebuild archive -scheme Snugbug` builds the
 *     clip and embeds it in the .app automatically.
 *   - Per-target provisioning profiles, because the workflow's archive
 *     step can no longer pass one PROVISIONING_PROFILE_SPECIFIER on the
 *     command line (that would override BOTH targets):
 *       main app -> "SnugBug App" (unchanged, same profile as before)
 *       clip     -> "SnugBug App Clip" (Joey: create this profile in the
 *                   Developer portal if it doesn't exist yet, App Store
 *                   distribution, including the Nov 6 distribution cert)
 *   - A matching 'SnugbugClip' target in the Podfile that installs React
 *     Native + Hermes only (no use_expo_modules! — no Expo modules in
 *     the clip, keeps it under the 15 MB App Clip limit).
 *
 * Portal/ASC steps Joey must do before the clip will build are listed in
 * the header comment of .github/workflows/ios-build.yml.
 */
const { withDangerousMod, withXcodeProject, withPodfile } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const CLIP_TARGET_NAME = 'SnugbugClip';
const CLIP_BUNDLE_ID = 'com.beatrackfaminc.snugbug.SnugBug';
const CLIP_PROFILE_NAME = 'SnugBug App Clip';
const MAIN_PROFILE_NAME = 'SnugBug App';
const CLIP_ENTRY_FILE = 'clip-entry.tsx';
const CLIP_PRODUCT_TYPE = 'com.apple.product-type.application.on-demand-install-capable';

// ---------------------------------------------------------------------------
// Files written under ios/SnugbugClip/
// ---------------------------------------------------------------------------

const APP_DELEGATE_SWIFT = `import React
import UIKit

/**
 * SnugbugClip AppDelegate — deliberately plain React Native, no Expo.
 *
 * The clip links React + Hermes only (see the Podfile target), so it uses
 * the classic RCTBridge / RCTRootView bootstrap instead of ExpoAppDelegate.
 * The JS entry point is clip-entry.tsx (module name "SnugbugClip"), a small
 * self-contained welcome screen — no router, no auth, no network, no AI
 * key needed. In Debug the bundle comes from Metro; in Release it is the
 * main.jsbundle embedded by the "Bundle React Native code and images"
 * build phase.
 */
@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  var bridge: RCTBridge?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let bridge = RCTBridge(delegate: self, launchOptions: launchOptions)
    self.bridge = bridge

    let rootView = RCTRootView(bridge: bridge, moduleName: "SnugbugClip", initialProperties: nil)
    rootView.backgroundColor = UIColor.black

    let window = UIWindow(frame: UIScreen.main.bounds)
    window.rootViewController = UIViewController()
    window.rootViewController?.view = rootView
    window.makeKeyAndVisible()
    self.window = window
    return true
  }
}

extension AppDelegate: RCTBridgeDelegate {
  func sourceURL(for bridge: RCTBridge) -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "clip-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
`;

const CLIP_INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>CFBundleDevelopmentRegion</key>
\t<string>en</string>
\t<key>CFBundleDisplayName</key>
\t<string>Snugbug</string>
\t<key>CFBundleExecutable</key>
\t<string>$(EXECUTABLE_NAME)</string>
\t<key>CFBundleIdentifier</key>
\t<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
\t<key>CFBundleInfoDictionaryVersion</key>
\t<string>6.0</string>
\t<key>CFBundleName</key>
\t<string>$(PRODUCT_NAME)</string>
\t<key>CFBundlePackageType</key>
\t<string>APPL</string>
\t<key>CFBundleShortVersionString</key>
\t<string>$(MARKETING_VERSION)</string>
\t<key>CFBundleVersion</key>
\t<string>$(CURRENT_PROJECT_VERSION)</string>
\t<key>LSApplicationQueriesSchemes</key>
\t<array>
\t\t<string>snugbug</string>
\t</array>
\t<key>LSRequiresIPhoneOS</key>
\t<true/>
\t<key>UILaunchScreen</key>
\t<dict/>
\t<key>UIRequiredDeviceCapabilities</key>
\t<array>
\t\t<string>arm64</string>
\t</array>
\t<key>UISupportedInterfaceOrientations</key>
\t<array>
\t\t<string>UIInterfaceOrientationPortrait</string>
\t\t<string>UIInterfaceOrientationPortraitUpsideDown</string>
\t</array>
\t<key>UISupportedInterfaceOrientations~ipad</key>
\t<array>
\t\t<string>UIInterfaceOrientationPortrait</string>
\t\t<string>UIInterfaceOrientationPortraitUpsideDown</string>
\t\t<string>UIInterfaceOrientationLandscapeLeft</string>
\t\t<string>UIInterfaceOrientationLandscapeRight</string>
\t</array>
\t<key>UIUserInterfaceStyle</key>
\t<string>Dark</string>
</dict>
</plist>
`;

const CLIP_ENTITLEMENTS = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>com.apple.developer.on-demand-install-capable</key>
\t<true/>
</dict>
</plist>
`;

// ---------------------------------------------------------------------------
// Mod 1: write the clip target's source files
// ---------------------------------------------------------------------------

function withAppClipFiles(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const clipDir = path.join(config.modRequest.platformProjectRoot, CLIP_TARGET_NAME);
      fs.mkdirSync(clipDir, { recursive: true });
      fs.writeFileSync(path.join(clipDir, 'AppDelegate.swift'), APP_DELEGATE_SWIFT);
      fs.writeFileSync(path.join(clipDir, 'Info.plist'), CLIP_INFO_PLIST);
      fs.writeFileSync(path.join(clipDir, 'SnugbugClip.entitlements'), CLIP_ENTITLEMENTS);
      return config;
    },
  ]);
}

// ---------------------------------------------------------------------------
// Mod 2: Xcode project — clip target, embed phase, per-target profiles
// ---------------------------------------------------------------------------

function stripQuotes(value) {
  return String(value == null ? '' : value).replace(/^"(.*)"$/, '$1');
}

function findFileRef(objects, filePath) {
  const refs = objects.PBXFileReference || {};
  for (const key of Object.keys(refs)) {
    if (/_comment$/.test(key)) continue;
    const ref = refs[key];
    if (ref && ref.path && stripQuotes(ref.path) === filePath) return key;
  }
  return null;
}

function withAppClipXcodeProject(config) {
  return withXcodeProject(config, async (config) => {
    const project = config.modResults;
    const objects = project.hash.project.objects;

    // Idempotency guard: re-running prebuild on an existing ios/ dir.
    if (project.pbxTargetByName(CLIP_TARGET_NAME)) {
      return config;
    }

    const mainTarget = project.getFirstTarget();
    const mainTargetUuid = mainTarget.uuid;
    const mainTargetObj = objects.PBXNativeTarget[mainTargetUuid];

    // The main target's bundle script, copied verbatim for the clip — it
    // resolves ENTRY_FILE from the environment, and the clip target sets
    // ENTRY_FILE=clip-entry.tsx as a build setting (see below).
    let mainBundleScript = null;
    const shellPhases = objects.PBXShellScriptBuildPhase || {};
    for (const phase of mainTargetObj.buildPhases || []) {
      const obj = shellPhases[phase.value];
      if (obj && stripQuotes(obj.name || '') === 'Bundle React Native code and images') {
        mainBundleScript = obj.shellScript;
        break;
      }
    }
    if (!mainBundleScript) {
      throw new Error(
        '[with-app-clip] Could not find the main target\'s "Bundle React Native code and images" phase to copy.',
      );
    }

    // Copy version / deployment target from the main target so the clip
    // always ships the same version/build as the app.
    const pickMain = (prop, fallback) => {
      try {
        const value = project.getBuildProperty(prop, 'Release', 'Snugbug');
        return value == null || value === '' ? fallback : value;
      } catch {
        return fallback;
      }
    };
    const marketingVersion = pickMain('MARKETING_VERSION', '1.0');
    const currentProjectVersion = pickMain('CURRENT_PROJECT_VERSION', '1');
    const deploymentTarget = pickMain('IPHONEOS_DEPLOYMENT_TARGET', '16.4');

    // The xcode package's addTarget() silently skips the main -> new
    // target dependency when the project has no PBXTargetDependency /
    // PBXContainerItemProxy sections yet (a fresh Expo project has
    // neither), so create them first.
    if (!objects.PBXTargetDependency) objects.PBXTargetDependency = {};
    if (!objects.PBXContainerItemProxy) objects.PBXContainerItemProxy = {};

    // --- Create the clip target (as a plain app target first — the xcode
    // package has no on-demand-install-capable type — then fix the
    // product type). addTarget also adds the main -> clip dependency.
    const clip = project.addTarget(CLIP_TARGET_NAME, 'application', CLIP_TARGET_NAME, CLIP_BUNDLE_ID);
    const clipUuid = clip.uuid;
    objects.PBXNativeTarget[clipUuid].productType = '"' + CLIP_PRODUCT_TYPE + '"';

    // addTarget() stores the target name WITH quotes ("SnugbugClip"),
    // which breaks pbxTargetByName()/updateBuildProperty() (they match
    // the unquoted comment). Normalize to unquoted so the build-setting
    // updates below actually land.
    objects.PBXNativeTarget[clipUuid].name = CLIP_TARGET_NAME;
    objects.PBXNativeTarget[clipUuid].productName = CLIP_TARGET_NAME;
    objects.PBXNativeTarget[clipUuid + '_comment'] = CLIP_TARGET_NAME;

    // --- Clip build settings (both Debug and Release).
    const setClip = (prop, value) => project.updateBuildProperty(prop, value, null, CLIP_TARGET_NAME);
    setClip('INFOPLIST_FILE', 'SnugbugClip/Info.plist');
    setClip('CODE_SIGN_ENTITLEMENTS', 'SnugbugClip/SnugbugClip.entitlements');
    setClip('ASSETCATALOG_COMPILER_APPICON_NAME', 'AppIcon');
    setClip('SWIFT_VERSION', '5.0');
    setClip('TARGETED_DEVICE_FAMILY', '"1,2"');
    setClip('IPHONEOS_DEPLOYMENT_TARGET', deploymentTarget);
    setClip('MARKETING_VERSION', marketingVersion);
    setClip('CURRENT_PROJECT_VERSION', currentProjectVersion);
    setClip('ENTRY_FILE', CLIP_ENTRY_FILE);
    // App Clips ARE installed into the archive (Xcode default); the xcode
    // package's addTarget sets SKIP_INSTALL=YES, which would drop the clip.
    setClip('SKIP_INSTALL', 'NO');
    setClip('PROVISIONING_PROFILE_SPECIFIER', '"' + CLIP_PROFILE_NAME + '"');

    // --- Main target keeps its exact existing profile, now as a per-target
    // setting (the workflow used to pass it on the command line, which
    // would override BOTH targets — see the workflow comment).
    project.updateBuildProperty(
      'PROVISIONING_PROFILE_SPECIFIER',
      '"' + MAIN_PROFILE_NAME + '"',
      null,
      'Snugbug',
    );

    // --- Clip build phases: Sources, Resources (shared AppIcon catalog),
    // and the bundle script. The [CP] phases are added by `pod install`.
    project.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', clipUuid);
    project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', clipUuid);
    project.addBuildPhase([], 'PBXShellScriptBuildPhase', 'Bundle React Native code and images', clipUuid, {
      shellPath: '/bin/sh',
      shellScript: 'true',
      alwaysOutOfDate: 1,
      inputPaths: ['$(SRCROOT)/.xcode.env', '$(SRCROOT)/.xcode.env.local'],
    });
    // The parsed main script keeps its surrounding quotes (the pbxproj
    // writer passes such values through as-is), but addBuildPhase would
    // re-quote + re-escape it — producing a double-escaped script. So
    // overwrite the phase's script in the hash with the raw parsed value.
    for (const phase of objects.PBXNativeTarget[clipUuid].buildPhases || []) {
      const shell = objects.PBXShellScriptBuildPhase && objects.PBXShellScriptBuildPhase[phase.value];
      if (shell) shell.shellScript = mainBundleScript;
    }

    // AppDelegate.swift into Sources + the clip group.
    const clipGroup = project.addPbxGroup([], CLIP_TARGET_NAME, CLIP_TARGET_NAME);
    project.addSourceFile('SnugbugClip/AppDelegate.swift', { target: clipUuid }, clipGroup.uuid);
    // Info.plist + entitlements are referenced by build settings only;
    // add them to the group so they show in the navigator.
    project.addFile('SnugbugClip/Info.plist', clipGroup.uuid);
    project.addFile('SnugbugClip/SnugbugClip.entitlements', clipGroup.uuid);
    // Put the clip group under the project root group.
    const rootGroupUuid = project.getFirstProject().firstProject.mainGroup;
    if (objects.PBXGroup[rootGroupUuid]) {
      objects.PBXGroup[rootGroupUuid].children.push({
        value: clipGroup.uuid,
        comment: CLIP_TARGET_NAME,
      });
    }

    // The shared AppIcon asset catalog goes into the clip's Resources
    // phase. addBuildPhase would reuse the main target's PBXBuildFile for
    // it; create a separate one so each target owns its entry.
    const imagesFileRef = findFileRef(objects, 'Snugbug/Images.xcassets');
    if (imagesFileRef) {
      const clipTargetObj = objects.PBXNativeTarget[clipUuid];
      const resourcesPhase = (clipTargetObj.buildPhases || [])
        .map((p) => objects.PBXResourcesBuildPhase && objects.PBXResourcesBuildPhase[p.value])
        .find(Boolean);
      if (resourcesPhase) {
        const bfUuid = project.generateUuid();
        objects.PBXBuildFile[bfUuid] = {
          isa: 'PBXBuildFile',
          fileRef: imagesFileRef,
          fileRef_comment: 'Images.xcassets',
        };
        objects.PBXBuildFile[bfUuid + '_comment'] = 'Images.xcassets in Resources';
        resourcesPhase.files.push({ value: bfUuid, comment: 'Images.xcassets in Resources' });
      }
    }

    // --- "Embed App Clips" phase on the main target (dstSubfolderSpec 16
    // is the App Clips folder inside the .app bundle). Inserted right
    // after Resources so it runs before the bundle script / signing.
    const embedPhaseUuid = project.generateUuid();
    if (!objects.PBXCopyFilesBuildPhase) objects.PBXCopyFilesBuildPhase = {};
    const productFileRef = objects.PBXNativeTarget[clipUuid].productReference;
    const embedBfUuid = project.generateUuid();
    objects.PBXBuildFile[embedBfUuid] = {
      isa: 'PBXBuildFile',
      fileRef: productFileRef,
      fileRef_comment: 'SnugbugClip.app',
    };
    objects.PBXBuildFile[embedBfUuid + '_comment'] = 'SnugbugClip.app in Embed App Clips';
    objects.PBXCopyFilesBuildPhase[embedPhaseUuid] = {
      isa: 'PBXCopyFilesBuildPhase',
      buildActionMask: 2147483647,
      dstPath: '""',
      dstSubfolderSpec: 16,
      files: [{ value: embedBfUuid, comment: 'SnugbugClip.app in Embed App Clips' }],
      name: '"Embed App Clips"',
      runOnlyForDeploymentPostprocessing: 0,
    };
    objects.PBXCopyFilesBuildPhase[embedPhaseUuid + '_comment'] = 'Embed App Clips';
    const embedEntry = { value: embedPhaseUuid, comment: 'Embed App Clips' };
    const mainPhases = mainTargetObj.buildPhases;
    const resourcesIdx = mainPhases.findIndex((p) => p.comment === 'Resources');
    if (resourcesIdx >= 0) {
      mainPhases.splice(resourcesIdx + 1, 0, embedEntry);
    } else {
      mainPhases.push(embedEntry);
    }

    // TargetAttributes entry for the clip (matches the main target's).
    const projectObj = objects.PBXProject[project.getFirstProject().uuid];
    if (projectObj) {
      if (!projectObj.attributes) projectObj.attributes = {};
      if (!projectObj.attributes.TargetAttributes) projectObj.attributes.TargetAttributes = {};
      projectObj.attributes.TargetAttributes[clipUuid] = { LastSwiftMigration: 1250 };
    }

    return config;
  });
}

// ---------------------------------------------------------------------------
// Mod 3: Podfile — React Native + Hermes only for the clip target
// ---------------------------------------------------------------------------

function withAppClipPodfile(config) {
  return withPodfile(config, (config) => {
    // NOTE: for the Podfile mod, modResults is NOT the file text — it is
    // { path, contents, language } (Paths.getFileInfo), and the writer
    // writes modResults.contents back. Editing modResults itself (a
    // string replace on the object) silently does nothing.
    const podfile = config.modResults && config.modResults.contents;
    if (typeof podfile !== 'string') return config;
    if (podfile.includes("target 'SnugbugClip'")) return config;
    const clipBlock = `
target 'SnugbugClip' do
  use_react_native!(
    :path => File.join(__dir__, '..', 'node_modules', 'react-native'),
    :hermes_enabled => podfile_properties['expo.jsEngine'] == nil || podfile_properties['expo.jsEngine'] == 'hermes',
    :app_path => "#{Pod::Config.instance.installation_root}/..",
    :privacy_file_aggregation_enabled => podfile_properties['apple.privacyManifestAggregationEnabled'] != 'false',
  )
end
`;
    config.modResults.contents = podfile.replace(/\n$/, '') + '\n' + clipBlock;
    return config;
  });
}

function withAppClip(config) {
  config = withAppClipFiles(config);
  config = withAppClipXcodeProject(config);
  config = withAppClipPodfile(config);
  return config;
}

module.exports = withAppClip;
