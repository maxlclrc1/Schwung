import AVFoundation
import CoreHaptics
import ExpoModulesCore
import UIKit

/// Development-only diagnostic: fires haptics straight through UIKit (and Core Haptics), on the main thread,
/// independently of expo-haptics, and reports what could be silencing them. Not used by the app itself.
public class SchwungHapticsDiagnosticModule: Module {
  // Held for the module's lifetime (never a generator that's released the moment the call returns).
  private var heavy: UIImpactFeedbackGenerator?
  private var engine: CHHapticEngine?

  public func definition() -> ModuleDefinition {
    Name("SchwungHapticsDiagnostic")

    // UIKit: UIImpactFeedbackGenerator(.heavy), prepared and fired on the main thread.
    AsyncFunction("nativeHeavy") { () -> [String: Any] in
      let onMain = Thread.isMainThread
      if self.heavy == nil { self.heavy = UIImpactFeedbackGenerator(style: .heavy) }
      self.heavy?.prepare()
      self.heavy?.impactOccurred(intensity: 1.0)
      NSLog("[SchwungHapticsDiagnostic] UIImpactFeedbackGenerator(.heavy).impactOccurred() reached UIKit (main thread: %@)", onMain ? "yes" : "no")
      return ["reachedUIKit": true, "mainThread": onMain]
    }.runOnQueue(.main)

    // Core Haptics: one strong transient event, which reports its own errors (UIKit's generators never do).
    AsyncFunction("coreHapticsHeavy") { () -> [String: Any] in
      guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else {
        return ["played": false, "error": "This device reports no haptics hardware (CHHapticEngine.supportsHaptics = false)"]
      }
      do {
        if self.engine == nil {
          self.engine = try CHHapticEngine()
          self.engine?.isAutoShutdownEnabled = true
        }
        try self.engine?.start()
        let event = CHHapticEvent(
          eventType: .hapticTransient,
          parameters: [
            CHHapticEventParameter(parameterID: .hapticIntensity, value: 1.0),
            CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.8),
          ],
          relativeTime: 0)
        let player = try self.engine?.makePlayer(with: CHHapticPattern(events: [event], parameters: []))
        try player?.start(atTime: CHHapticTimeImmediate)
        NSLog("[SchwungHapticsDiagnostic] Core Haptics transient played")
        return ["played": true]
      } catch {
        NSLog("[SchwungHapticsDiagnostic] Core Haptics failed: %@", String(describing: error))
        return ["played": false, "error": String(describing: error)]
      }
    }.runOnQueue(.main)

    // What could silence haptics: hardware, the audio session (recording suppresses haptics unless allowed),
    // screen capture, power and app state.
    AsyncFunction("environment") { () -> [String: Any] in
      let session = AVAudioSession.sharedInstance()
      let state: String
      switch UIApplication.shared.applicationState {
      case .active: state = "active"
      case .inactive: state = "inactive"
      case .background: state = "background"
      @unknown default: state = "unknown"
      }
      return [
        "supportsHaptics": CHHapticEngine.capabilitiesForHardware().supportsHaptics,
        "audioCategory": session.category.rawValue,
        "audioMode": session.mode.rawValue,
        "allowHapticsDuringRecording": session.allowHapticsAndSystemSoundsDuringRecording,
        "otherAudioPlaying": session.isOtherAudioPlaying,
        "inputAvailable": session.isInputAvailable,
        "screenCaptured": UIApplication.shared.connectedScenes
          .compactMap { ($0 as? UIWindowScene)?.screen.isCaptured }.contains(true),
        "lowPowerMode": ProcessInfo.processInfo.isLowPowerModeEnabled,
        "applicationState": state,
        "model": UIDevice.current.model,
        "systemVersion": UIDevice.current.systemVersion,
      ]
    }.runOnQueue(.main)
  }
}
