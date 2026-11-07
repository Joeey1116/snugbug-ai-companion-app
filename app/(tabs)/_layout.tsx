import React from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useAuth } from "../../lib/auth";

/**
 * Bottom navigation is the OS's OWN tab bar (UITabBar on iOS, the
 * Material navigation bar on Android) instead of a hand-drawn pill.
 * On iOS 26 the system draws it as the floating Liquid Glass capsule —
 * the genuine article, rendered by Apple, not an imitation.
 * (Copied 1:1 from the proven Rewards setup, same
 * expo-router/react-native-screens versions; tab names adapted.)
 *
 * Session guard: the tabs exist ONLY behind a real signed-in session.
 * Any route that lands here without one is bounced to onboarding.
 * While the provider is still restoring the session, render the black
 * backdrop instead of flashing either the tabs or a redirect.
 *
 * NOTE: there is no separate "Companion" tab — per concept-visual-v2
 * the tab bar is Chat / Feed / Ideas / Tasks / More, and the companion
 * world (house + garden, voice call button) lives on its own screen,
 * reached by tapping the avatar on the Feed tab or from More.
 */
export default function TabsLayout() {
  const { status } = useAuth();

  if (status === "loading") {
    return <View style={{ flex: 1, backgroundColor: "#000000" }} />;
  }
  if (status !== "signedIn") {
    return <Redirect href="/onboarding" />;
  }

  return (
    <NativeTabs
      tintColor="#ffffff"
      iconColor={{ default: "#666666", selected: "#ffffff" }}
      labelStyle={{
        default: { color: "#666666", fontWeight: "500" },
        selected: { color: "#ffffff", fontWeight: "700" },
      }}
    >
      <NativeTabs.Trigger
        name="index"
        contentStyle={{ backgroundColor: "#000000" }}
        disableTransparentOnScrollEdge
      >
        <NativeTabs.Trigger.Label>Chat</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "message", selected: "message.fill" }}
          md="chat"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="feed"
        contentStyle={{ backgroundColor: "#000000" }}
        disableTransparentOnScrollEdge
      >
        <NativeTabs.Trigger.Label>Feed</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "newspaper", selected: "newspaper.fill" }}
          md="feed"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="ideas"
        contentStyle={{ backgroundColor: "#000000" }}
        disableTransparentOnScrollEdge
      >
        <NativeTabs.Trigger.Label>Ideas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "lightbulb", selected: "lightbulb.fill" }}
          md="lightbulb"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="tasks"
        contentStyle={{ backgroundColor: "#000000" }}
        disableTransparentOnScrollEdge
      >
        <NativeTabs.Trigger.Label>Tasks</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "checkmark.square", selected: "checkmark.square.fill" }}
          md="check_box"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="more"
        contentStyle={{ backgroundColor: "#000000" }}
        disableTransparentOnScrollEdge
      >
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "ellipsis.circle", selected: "ellipsis.circle.fill" }}
          md="more_horiz"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
