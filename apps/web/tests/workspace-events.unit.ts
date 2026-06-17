#!/usr/bin/env tsx

import { notifyWorkspaceChanged, subscribeWorkspaceChanges } from "../src/lib/workspaces/events.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function main() {
  let firstWorkspaceNotifications = 0;
  let secondSubscriberNotifications = 0;
  let otherWorkspaceNotifications = 0;

  const unsubscribeFirst = subscribeWorkspaceChanges("workspace_events_a", () => {
    firstWorkspaceNotifications += 1;
  });
  const unsubscribeSecond = subscribeWorkspaceChanges("workspace_events_a", () => {
    secondSubscriberNotifications += 1;
  });
  const unsubscribeOther = subscribeWorkspaceChanges("workspace_events_b", () => {
    otherWorkspaceNotifications += 1;
  });

  notifyWorkspaceChanged("workspace_events_a");
  assert(firstWorkspaceNotifications === 1, "first subscriber receives same-workspace notifications");
  assert(secondSubscriberNotifications === 1, "second subscriber receives same-workspace notifications");
  assert(otherWorkspaceNotifications === 0, "other workspace subscriber is isolated");

  unsubscribeFirst();
  notifyWorkspaceChanged("workspace_events_a");
  assert(firstWorkspaceNotifications === 1, "unsubscribed listener stops receiving notifications");
  assert(secondSubscriberNotifications === 2, "remaining listener still receives notifications after peer unsubscribe");

  unsubscribeSecond();
  notifyWorkspaceChanged("workspace_events_a");
  assert(secondSubscriberNotifications === 2, "last listener can unsubscribe cleanly");

  notifyWorkspaceChanged("workspace_events_b");
  assert(otherWorkspaceNotifications === 1, "other workspace still receives its own notifications");
  unsubscribeOther();

  process.stdout.write("[workspace-events.unit] ALL EVENT HUB CHECKS PASSED\n");
}

main();
