(function () {
    "use strict";

    var defaults = {
        endpoint: "/api/register",
        fields: {
            email: "email",
            password: "password",
            confirmPassword: "confirmPassword"
        },
        tokenPath: "token",
        storageKey: "auth_token",
        signInUrl: "./login.html",
        socialUrls: {
            google: "#",
            wechat: "#",
            instagram: "#",
            whatsapp: "#"
        }
    };

    var incoming = typeof window.REGISTER_CONFIG === "object" && window.REGISTER_CONFIG !== null
        ? window.REGISTER_CONFIG
        : {};

    window.REGISTER_CONFIG = {
        endpoint: typeof incoming.endpoint === "string" && incoming.endpoint.trim()
            ? incoming.endpoint.trim()
            : defaults.endpoint,
        fields: {
            email: incoming.fields && typeof incoming.fields.email === "string" && incoming.fields.email.trim()
                ? incoming.fields.email.trim()
                : defaults.fields.email,
            password: incoming.fields && typeof incoming.fields.password === "string" && incoming.fields.password.trim()
                ? incoming.fields.password.trim()
                : defaults.fields.password,
            confirmPassword: incoming.fields && typeof incoming.fields.confirmPassword === "string" && incoming.fields.confirmPassword.trim()
                ? incoming.fields.confirmPassword.trim()
                : defaults.fields.confirmPassword
        },
        tokenPath: typeof incoming.tokenPath === "string" && incoming.tokenPath.trim()
            ? incoming.tokenPath.trim()
            : defaults.tokenPath,
        storageKey: typeof incoming.storageKey === "string" && incoming.storageKey.trim()
            ? incoming.storageKey.trim()
            : defaults.storageKey,
        signInUrl: typeof incoming.signInUrl === "string" && incoming.signInUrl.trim()
            ? incoming.signInUrl.trim()
            : defaults.signInUrl,
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

    var config = window.REGISTER_CONFIG;
    var form = document.getElementById("register-form");
    var emailInput = document.getElementById("register-email");
    var passwordInput = document.getElementById("register-password");
    var confirmInput = document.getElementById("register-confirm-password");
    var termsInput = document.getElementById("accept-terms");
    var statusEl = document.getElementById("register-status");
    var registerBtn = document.getElementById("register-btn");
    var isSubmitting = false;

    if (!form || !emailInput || !passwordInput || !confirmInput || !termsInput || !statusEl || !registerBtn) {
        return;
    }

    setLink("signin-link", config.signInUrl);
    setLink("register-social-google", config.socialUrls.google);
    setLink("register-social-wechat", config.socialUrls.wechat);
    setLink("register-social-instagram", config.socialUrls.instagram);
    setLink("register-social-whatsapp", config.socialUrls.whatsapp);

    emailInput.addEventListener("input", handleFieldInput);
    passwordInput.addEventListener("input", handleFieldInput);
    confirmInput.addEventListener("input", handleFieldInput);
    termsInput.addEventListener("change", handleFieldInput);

    var toggles = document.querySelectorAll(".password-toggle[data-toggle-target]");
    for (var i = 0; i < toggles.length; i += 1) {
        attachToggleHandler(toggles[i]);
    }

    syncSubmitState();

    function attachToggleHandler(toggleBtn) {
        toggleBtn.addEventListener("click", function () {
            var targetId = toggleBtn.getAttribute("data-toggle-target");
            var targetInput = targetId ? document.getElementById(targetId) : null;

            if (!targetInput) {
                return;
            }

            var reveal = targetInput.type === "password";
            targetInput.type = reveal ? "text" : "password";
            toggleBtn.textContent = reveal ? "Hide" : "Show";
            toggleBtn.setAttribute("aria-pressed", reveal ? "true" : "false");
            toggleBtn.setAttribute("aria-label", (reveal ? "Hide" : "Show") + " password");
        });
    }

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
        registerBtn.disabled = !emailInput.value.trim() || !passwordInput.value.trim() || !confirmInput.value.trim() || !termsInput.checked;
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

    function validate(account, password, confirmPassword, acceptedTerms) {
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
        if (!confirmPassword) {
            return "Please confirm your password.";
        }
        if (password !== confirmPassword) {
            return "Passwords do not match.";
        }
        if (!acceptedTerms) {
            return "Please accept the Terms & Privacy Policy.";
        }
        return "";
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        var account = emailInput.value.trim();
        var password = passwordInput.value;
        var confirmPassword = confirmInput.value;
        var acceptedTerms = termsInput.checked;

        var validationError = validate(account, password, confirmPassword, acceptedTerms);
        if (validationError) {
            setStatus(validationError, "error");
            return;
        }

        var payload = {};
        payload[config.fields.email] = account;
        payload[config.fields.password] = password;
        payload[config.fields.confirmPassword] = confirmPassword;

        var originalText = registerBtn.textContent;
        isSubmitting = true;
        registerBtn.disabled = true;
        registerBtn.textContent = "Registering...";
        setStatus("Creating your account...", "info");

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
                    data = { message: rawBody };
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

            if (!isEmptyToken(token)) {
                localStorage.setItem(config.storageKey, String(token));
            }

            setStatus("Registration successful. You can sign in now.", "success");
        } catch (error) {
            setStatus(error instanceof Error ? error.message : "Unable to register. Please try again.", "error");
        } finally {
            isSubmitting = false;
            registerBtn.textContent = originalText;
            syncSubmitState();
        }
    });
})();
