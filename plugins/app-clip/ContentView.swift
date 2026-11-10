import StoreKit
import SwiftUI

// MARK: - App Store ID
// Snugbug's App Store Connect app record exists ("SnugBug - AI Companion
// App", verified Nov 10 2026): App Store Connect ID 6831869577.
private let appStoreID = "6831869577"

// MARK: - Model

/// The same little sparks the React Native clip offered, embedded here so
/// the clip needs no network and no JavaScript. Tapping one shows its
/// canned reply — a tiny taste of the companion. No timers, no scores,
/// no ads, no accounts.
private let sparks: [(label: String, reply: String)] = [
  (
    label: "I need a spark",
    reply:
      "Here is a little one, just for you: you showed up today, and that counts. One small step is still a step."
  ),
  (
    label: "Help me breathe",
    reply:
      "Let's do it together. Breathe in slowly… and out slowly. Again. You're doing great — nice and easy."
  ),
  (
    label: "Cheer me on",
    reply:
      "You've got this. Whatever today throws at you, you've handled hard days before — and you'll handle this one too."
  ),
]

// MARK: - View

struct ContentView: View {
  /// The URL that launched this clip, if any (App Clip Code / link).
  let invocationURL: URL?

  @State private var reply: String?
  @State private var showAppStoreOverlay = false

  var body: some View {
    ZStack {
      Color.black.ignoresSafeArea()
      ScrollView {
        VStack(spacing: 28) {
          header
          sparksSection
          actionsSection
          footer
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 32)
      }
    }
    .preferredColorScheme(.dark)
    .appStoreOverlay(isPresented: $showAppStoreOverlay) {
      // Full Snugbug app in the App Store.
      SKOverlay.AppConfiguration(appIdentifier: appStoreID, position: .bottom)
    }
  }

  // MARK: Sections

  private var header: some View {
    VStack(spacing: 8) {
      Text("APP CLIP")
        .font(.caption.weight(.bold))
        .tracking(2)
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(Color.white.opacity(0.15))
        .clipShape(Capsule())
      Text("Snugbug")
        .font(.system(size: 34, weight: .black))
        .foregroundColor(.white)
        .multilineTextAlignment(.center)
      Text("A little companion for the hard days.")
        .font(.headline)
        .foregroundColor(.white.opacity(0.75))
        .multilineTextAlignment(.center)
    }
  }

  private var sparksSection: some View {
    VStack(spacing: 16) {
      Text("TRY A SPARK")
        .font(.caption.weight(.semibold))
        .tracking(1)
        .foregroundColor(.white.opacity(0.6))
      ForEach(sparks, id: \.label) { spark in
        Button {
          reply = spark.reply
        } label: {
          Text(spark.label)
            .font(.subheadline.weight(.semibold))
            .foregroundColor(.white.opacity(0.8))
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(Color.white.opacity(0.12))
            .clipShape(Capsule())
        }
      }
      if let reply {
        Text(reply)
          .font(.system(size: 18, weight: .medium))
          .foregroundColor(.white)
          .multilineTextAlignment(.center)
          .lineSpacing(4)
          .padding(18)
          .frame(maxWidth: .infinity)
          .background(Color.white.opacity(0.08))
          .clipShape(RoundedRectangle(cornerRadius: 16))
      }
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 8)
  }

  private var actionsSection: some View {
    VStack(spacing: 12) {
      Button {
        showAppStoreOverlay = true
      } label: {
        Text("Get the full app — free")
          .font(.headline)
          .frame(maxWidth: .infinity)
          .padding(.vertical, 14)
          .background(Color.white)
          .foregroundColor(.black)
          .clipShape(RoundedRectangle(cornerRadius: 12))
      }
      Link(destination: URL(string: "snugbug://")!) {
        Text("Already have the app? Open it")
          .font(.subheadline.weight(.semibold))
          .foregroundColor(.white.opacity(0.7))
      }
    }
  }

  private var footer: some View {
    Text("Snugbug · Your little AI friend — check-ins, gentle reminders, and little sparks of encouragement.")
      .font(.caption)
      .foregroundColor(.white.opacity(0.45))
      .multilineTextAlignment(.center)
      .frame(maxWidth: .infinity)
  }
}
