// UsernameReplacer for Enmity (iOS)
// Converts Vencord plugin to Enmity API.
// Works on mobile, replaces target usernames in chat/UI.

import { Plugin } from "enmity/managers/plugins";
import { React, ReactNative } from "enmity/metro/common";
import { Storage } from "enmity/api/storage";
import { getByProps } from "enmity/metro";

const UserStore = getByProps("getCurrentUser");

let observer = null;
let currentUserName = null;

const settings = Storage.make("username-replacer-settings", {
    targetUsername: "vrline",
    newUsername: "CustomName",
    enabled: true
});

function getCurrentUser() {
    try {
        const user = UserStore.getCurrentUser();
        if (user) {
            currentUserName = user.username;
            console.log("[UsernameReplacer] Current username:", currentUserName);
        }
    } catch (err) {
        console.log("[UsernameReplacer] Failed to fetch current user:", err);
    }
}

function isOwnElement(element) {
    if (!currentUserName) return false;

    let parent = element;
    let depth = 0;

    while (parent && parent !== document.body && depth < 10) {
        const usernames = parent.querySelectorAll('[class*="username"]');
        for (const u of usernames) {
            if (u.textContent === currentUserName && u !== element) {
                return true;
            }
        }
        parent = parent.parentElement;
        depth++;
    }

    return false;
}

function modifyUsernames() {
    if (!settings.enabled) return;

    const target = settings.targetUsername;
    const replacement = settings.newUsername;

    if (!target || !replacement) return;

    let count = 0;

    const selectors = [
        '[class*="userTagUsername"]',
        '[class*="username"]',
        'span[class*="username"]',
        'h3[class*="heading"]',
        'h3[data-text-variant*="heading"]'
    ];

    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);

        elements.forEach(el => {
            const text = el.textContent?.trim();
            if (!text) return;
            if (text.length > 100) return;
            if (text !== target) return;
            if (text === replacement) return;

            if (isOwnElement(el)) return;

            if (!el.dataset.originalUsername) {
                el.dataset.originalUsername = text;
                el.dataset.modified = "true";
            }

            el.textContent = replacement;
            count++;
        });
    });

    if (count > 0) console.log(`[UsernameReplacer] Modified ${count} elements`);
}

function startObserver() {
    if (observer) observer.disconnect();

    observer = new MutationObserver(() => {
        setTimeout(modifyUsernames, 100);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    console.log("[UsernameReplacer] DOM observer started");
}

function stopObserver() {
    if (observer) {
        observer.disconnect();
        observer = null;
        console.log("[UsernameReplacer] DOM observer stopped");
    }
}

function restoreOriginalUsernames() {
    document.querySelectorAll('[data-modified="true"]').forEach(el => {
        if (el.dataset.originalUsername) {
            el.textContent = el.dataset.originalUsername;
            delete el.dataset.originalUsername;
            delete el.dataset.modified;
        }
    });
    console.log("[UsernameReplacer] Restored original usernames");
}

export default new Plugin({
    name: "UsernameReplacer",
    version: "1.0.0",
    description: "Replace specific usernames with custom names.",
    authors: ["yourname"],

    onStart() {
        console.log("[UsernameReplacer] Started");

        setTimeout(getCurrentUser, 800);
        setTimeout(modifyUsernames, 1500);

        startObserver();

        this.interval = setInterval(modifyUsernames, 2500);
    },

    onStop() {
        console.log("[UsernameReplacer] Stopped");

        if (this.interval) clearInterval(this.interval);

        stopObserver();
        restoreOriginalUsernames();
    },

    // ⚙️ Settings exposed inside Enmity UI
    settings: [
        {
            key: "enabled",
            type: "switch",
            name: "Enable Plugin",
            default: settings.enabled,
            onChange: v => settings.enabled = v
        },
        {
            key: "targetUsername",
            type: "text",
            name: "Target Username",
            default: settings.targetUsername,
            onChange: v => settings.targetUsername = v
        },
        {
            key: "newUsername",
            type: "text",
            name: "Replacement Username",
            default: settings.newUsername,
            onChange: v => settings.newUsername = v
        }
    ]
});
