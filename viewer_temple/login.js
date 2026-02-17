(function () {
    "use strict";

    var defaults = {
        endpoint: "/api/login",
        fields: {
            email: "email",
            password: "password"
        },
        tokenPath: "token",
        storageKey: "auth_token",
        signupUrl: "./register.html",
        socialUrls: {
            google: "#",
            wechat: "#",
            instagram: "#",
            whatsapp: "#"
        }
    };

    var incoming = typeof window.LOGIN_CONFIG === "object" && window.LOGIN_CONFIG !== null
        ? window.LOGIN_CONFIG
        : {};

    window.LOGIN_CONFIG = {
        endpoint: typeof incoming.endpoint === "string" && incoming.endpoint.trim()
            ? incoming.endpoint.trim()
            : defaults.endpoint,
        fields: {
            email: incoming.fields && typeof incoming.fields.email === "string" && incoming.fields.email.trim()
                ? incoming.fields.email.trim()
                : defaults.fields.email,
            password: incoming.fields && typeof incoming.fields.password === "string" && incoming.fields.password.trim()
                ? incoming.fields.password.trim()
                : defaults.fields.password
        },
        tokenPath: typeof incoming.tokenPath === "string" && incoming.tokenPath.trim()
            ? incoming.tokenPath.trim()
            : defaults.tokenPath,
        storageKey: typeof incoming.storageKey === "string" && incoming.storageKey.trim()
            ? incoming.storageKey.trim()
            : defaults.storageKey,
        signupUrl: typeof incoming.signupUrl === "string" && incoming.signupUrl.trim()
            ? incoming.signupUrl.trim()
            : defaults.signupUrl,
        socialUrls: {
            google: incoming.socialUrls && typeof incoming.socialUrls.google === "string" && incoming.socialUrls.google.trim()
                ? incoming.socialUrls.google.trim()
                : defaults.socialUrls.google,
            wechat: incoming.socialUrls && typeof incoming.socialUrls.wechat === "string" && incoming.socialUrls.wechat.trim()
                ? incoming.socialUrls.wechat.trim()
                : defaults.socialUrls.wechat,
            instagram: incoming.socialUrls && typeof incoming.socialUrls.instagram === "string" && incoming.socialUrls.instagram.trim()
                ? incoming.socialUrls.instagram.trim()
                : defaults.socialUrls.instagram,
            whatsapp: incoming.socialUrls && typeof incoming.socialUrls.whatsapp === "string" && incoming.socialUrls.whatsapp.trim()
                ? incoming.socialUrls.whatsapp.trim()
                : defaults.socialUrls.whatsapp
        }
    };

    var config = window.LOGIN_CONFIG;
    var form = document.getElementById("login-form");
    var emailInput = document.getElementById("email");
    var passwordInput = document.getElementById("password");
    var passwordToggle = document.getElementById("password-toggle");
    var statusEl = document.getElementById("form-status");
    var loginBtn = document.getElementById("login-btn");
    var isSubmitting = false;

    if (!form || !emailInput || !passwordInput || !statusEl || !loginBtn) {
        return;
    }

    setLink("signup-link", config.signupUrl);
    setLink("social-google", config.socialUrls.google);
    setLink("social-wechat", config.socialUrls.wechat);
    setLink("social-instagram", config.socialUrls.instagram);
    setLink("social-whatsapp", config.socialUrls.whatsapp);
    emailInput.addEventListener("input", handleFieldInput);
    passwordInput.addEventListener("input", handleFieldInput);

    if (passwordToggle) {
        passwordToggle.addEventListener("click", function () {
            var reveal = passwordInput.type === "password";
            passwordInput.type = reveal ? "text" : "password";
            passwordToggle.textContent = reveal ? "Hide" : "Show";
            passwordToggle.setAttribute("aria-pressed", reveal ? "true" : "false");
            passwordToggle.setAttribute("aria-label", (reveal ? "Hide" : "Show") + " password");
        });
    }

    syncSubmitState();

    function handleFieldInput() {
        if (statusEl.dataset.state === "error") {
            setStatus("", "");
        }
        syncSubmitState();
    }

    function setLink(id, hrefValue) {
        var el = document.getElementById(id);
        if (!el) {
            return;
        }
        el.setAttribute("href", typeof hrefValue === "string" && hrefValue.trim() ? hrefValue.trim() : "#");
    }

    function setStatus(message, state) {
        statusEl.textContent = message;
        statusEl.dataset.state = state || "";
    }

    function syncSubmitState() {
        if (isSubmitting) {
            return;
        }
        loginBtn.disabled = !emailInput.value.trim() || !passwordInput.value.trim();
    }

    function isEmptyToken(token) {
        return token === undefined || token === null || token === "";
    }

    function getByPath(source, path) {
        if (!source || typeof source !== "object" || typeof path !== "string" || !path.trim()) {
            return undefined;
        }

        var parts = path.split(".");
        var cursor = source;

        for (var i = 0; i < parts.length; i += 1) {
            var key = parts[i];
            if (!key || typeof cursor !== "object" || cursor === null || !(key in cursor)) {
                return undefined;
            }
            cursor = cursor[key];
        }

        return cursor;
    }

    function readMessage(payload, statusCode) {
        if (payload && typeof payload === "object") {
            if (typeof payload.message === "string" && payload.message.trim()) {
                return payload.message.trim();
            }
            if (typeof payload.error === "string" && payload.error.trim()) {
                return payload.error.trim();
            }
        }
        return "Request failed (" + statusCode + ").";
    }

    function validate(account, password) {
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        var phoneRegex = /^\+?\d{7,15}$/;

        if (!account) {
            return "Please enter your email or phone.";
        }
        if (!emailRegex.test(account) && !phoneRegex.test(account)) {
            return "Please enter a valid email or phone number.";
        }
        if (!password) {
            return "Please enter your password.";
        }
        if (password.length < 6) {
            return "Password must be at least 6 characters.";
        }
        return "";
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        var account = emailInput.value.trim();
        var password = passwordInput.value;
        var validationError = validate(account, password);

        if (validationError) {
            setStatus(validationError, "error");
            return;
        }

        var payload = {};
        payload[config.fields.email] = account;
        payload[config.fields.password] = password;

        var originalText = loginBtn.textContent;
        isSubmitting = true;
        loginBtn.disabled = true;
        loginBtn.textContent = "Logging in...";
        setStatus("Logging in...", "info");

        try {
            var response = await fetch(config.endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            var rawBody = await response.text();
            var data = {};

            if (rawBody) {
                try {
                    data = JSON.parse(rawBody);
                } catch (parseError) {
                    data = {
                        message: rawBody
                    };
                }
            }

            if (!response.ok) {
                throw new Error(readMessage(data, response.status));
            }

            var token = getByPath(data, config.tokenPath);
            if (isEmptyToken(token) && data && typeof data === "object" && !isEmptyToken(data.token)) {
                token = data.token;
            }
            if (isEmptyToken(token) && data && typeof data === "object" && data.data && !isEmptyToken(data.data.token)) {
                token = data.data.token;
            }

            if (isEmptyToken(token)) {
                throw new Error("Login succeeded but token was not found.");
            }

            localStorage.setItem(config.storageKey, String(token));
            setStatus("Login successful.", "success");
        } catch (error) {
            setStatus(error instanceof Error ? error.message : "Unable to login. Please try again.", "error");
        } finally {
            isSubmitting = false;
            loginBtn.textContent = originalText;
            syncSubmitState();
        }
    });
})();
