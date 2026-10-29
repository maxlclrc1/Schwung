Pod::Spec.new do |s|
  s.name           = 'SchwungHapticsDiagnostic'
  s.version        = '1.0.0'
  s.summary        = 'Development-only check of UIKit haptics, independent of expo-haptics.'
  s.description    = 'Fires UIImpactFeedbackGenerator and Core Haptics directly on the main thread and reports the environment.'
  s.license        = 'UNLICENSED'
  s.author         = 'Schwung'
  s.homepage       = 'https://example.com'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'SWIFT_COMPILATION_MODE' => 'wholemodule' }
end
