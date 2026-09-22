import {
    useState,
} from 'react';

import type {
    FormEvent,
} from 'react';

import {
    useNavigate,
} from 'react-router';

import { useAuth }
    from '../auth/AuthContext';

import { getRoleHome }
    from '../auth/roleHome';

import { ApiError }
    from '../lib/api';

const loginPageStyles = `
    #sapo-login-page,
    #sapo-login-page *,
    #sapo-login-page *::before,
    #sapo-login-page *::after {
        box-sizing: border-box !important;
    }

    #sapo-login-page {
        --lp-green-950: #052e16;
        --lp-green-900: #14532d;
        --lp-green-800: #166534;
        --lp-green-700: #15803d;
        --lp-green-600: #16a34a;
        --lp-green-500: #22c55e;
        --lp-leaf: #4ade80;
        --lp-harvest: #f59e0b;
        --lp-harvest-light: #fbbf24;
        --lp-red: #dc2626;
        --lp-red-light: #fef2f2;
        --lp-text: #0f172a;
        --lp-text-secondary: #334155;
        --lp-muted: #64748b;
        --lp-border: #e2e8f0;
        --lp-border-strong: #cbd5e1;
        --lp-white: #ffffff;
        --lp-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        --lp-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

        position: relative !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 100vw !important;
        min-height: 100vh !important;
        min-height: 100dvh !important;
        margin: 0 !important;
        padding: 24px !important;
        overflow: hidden !important;
        background:
            linear-gradient(
                145deg,
                #041c0f 0%,
                #052e16 26%,
                #0b3d20 52%,
                #052e16 78%,
                #041c0f 100%
            ) !important;
        background-size: 200% 200% !important;
        animation:
            lp-bg-drift 22s ease-in-out infinite !important;
        font-family: var(--lp-font) !important;
        color: var(--lp-text-secondary) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        isolation: isolate !important;
    }

    #sapo-login-page h1,
    #sapo-login-page h2,
    #sapo-login-page p,
    #sapo-login-page span,
    #sapo-login-page strong,
    #sapo-login-page small,
    #sapo-login-page label,
    #sapo-login-page button,
    #sapo-login-page input {
        font-family: var(--lp-font) !important;
        letter-spacing: normal !important;
    }

    #sapo-login-page h1,
    #sapo-login-page h2,
    #sapo-login-page p {
        margin: 0 !important;
        padding: 0 !important;
    }

    /* =========================================================
       KEYFRAMES
       ========================================================= */
    @keyframes lp-bg-drift {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
    }

    @keyframes lp-float-a {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        50% { transform: translate3d(40px, -50px, 0) scale(1.14); }
    }

    @keyframes lp-float-b {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        50% { transform: translate3d(-50px, 40px, 0) scale(1.10); }
    }

    @keyframes lp-float-c {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
        50% { transform: translate3d(30px, 60px, 0) scale(1.18); }
    }

    @keyframes lp-fade-up {
        0% { opacity: 0; transform: translateY(20px); }
        100% { opacity: 1; transform: translateY(0); }
    }

    @keyframes lp-fade-in {
        0% { opacity: 0; }
        100% { opacity: 1; }
    }

    @keyframes lp-scale-in {
        0% { opacity: 0; transform: scale(0.94) translateY(14px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
    }

    @keyframes lp-pulse-ring {
        0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.42); }
        70% { box-shadow: 0 0 0 20px rgba(74, 222, 128, 0); }
        100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
    }

    @keyframes lp-shimmer {
        0% { transform: translateX(-130%); }
        100% { transform: translateX(240%); }
    }

    @keyframes lp-spin {
        to { transform: rotate(360deg); }
    }

    @keyframes lp-slide-in {
        0% { opacity: 0; transform: translateY(-8px); }
        100% { opacity: 1; transform: translateY(0); }
    }

    @keyframes lp-rotate-slow {
        to { transform: rotate(360deg); }
    }

    /* =========================================================
       BACKGROUND — ANIMATED LAYERS
       ========================================================= */
    #sapo-login-page .lp-bg {
        position: absolute !important;
        inset: 0 !important;
        z-index: 0 !important;
        overflow: hidden !important;
        pointer-events: none !important;
    }

    /* moving grid */
    #sapo-login-page .lp-bg-grid {
        position: absolute !important;
        inset: -2px !important;
        background-image:
            linear-gradient(
                rgba(74, 222, 128, 0.06) 1px,
                transparent 1px
            ),
            linear-gradient(
                90deg,
                rgba(74, 222, 128, 0.06) 1px,
                transparent 1px
            ) !important;
        background-size: 60px 60px !important;
        -webkit-mask-image:
            radial-gradient(
                ellipse at center,
                #000 20%,
                transparent 78%
            ) !important;
        mask-image:
            radial-gradient(
                ellipse at center,
                #000 20%,
                transparent 78%
            ) !important;
    }

    /* glowing orbs */
    #sapo-login-page .lp-orb {
        position: absolute !important;
        border-radius: 50% !important;
        filter: blur(50px) !important;
        will-change: transform !important;
    }

    #sapo-login-page .lp-orb-a {
        top: -10% !important;
        left: -8% !important;
        width: 520px !important;
        height: 520px !important;
        background:
            radial-gradient(
                circle at 40% 40%,
                rgba(34, 197, 94, 0.55),
                rgba(34, 197, 94, 0) 70%
            ) !important;
        animation: lp-float-a 16s ease-in-out infinite !important;
    }

    #sapo-login-page .lp-orb-b {
        bottom: -14% !important;
        right: -10% !important;
        width: 580px !important;
        height: 580px !important;
        background:
            radial-gradient(
                circle at 50% 50%,
                rgba(245, 158, 11, 0.42),
                rgba(245, 158, 11, 0) 70%
            ) !important;
        animation: lp-float-b 19s ease-in-out infinite !important;
    }

    #sapo-login-page .lp-orb-c {
        top: 40% !important;
        left: 55% !important;
        width: 380px !important;
        height: 380px !important;
        background:
            radial-gradient(
                circle at 50% 50%,
                rgba(74, 222, 128, 0.32),
                rgba(74, 222, 128, 0) 70%
            ) !important;
        animation: lp-float-c 22s ease-in-out infinite !important;
    }

    #sapo-login-page .lp-orb-d {
        top: 55% !important;
        left: 5% !important;
        width: 300px !important;
        height: 300px !important;
        background:
            radial-gradient(
                circle at 50% 50%,
                rgba(16, 185, 129, 0.30),
                rgba(16, 185, 129, 0) 70%
            ) !important;
        animation: lp-float-b 17s 2s ease-in-out infinite !important;
    }

    /* floating particles */
    #sapo-login-page .lp-particle {
        position: absolute !important;
        border-radius: 50% !important;
        background: rgba(74, 222, 128, 0.85) !important;
        box-shadow: 0 0 8px rgba(74, 222, 128, 0.7) !important;
        animation:
            lp-particle-rise linear infinite !important;
    }

    @keyframes lp-particle-rise {
        0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
        }
        10% { opacity: 0.9; }
        90% { opacity: 0.7; }
        100% {
            transform: translateY(-115vh) translateX(60px);
            opacity: 0;
        }
    }

    #sapo-login-page .lp-particle-1 {
        left: 12% !important;
        bottom: -20px !important;
        width: 5px !important;
        height: 5px !important;
        animation-duration: 17s !important;
        animation-delay: 0s !important;
    }

    #sapo-login-page .lp-particle-2 {
        left: 26% !important;
        bottom: -20px !important;
        width: 3px !important;
        height: 3px !important;
        background: rgba(251, 191, 36, 0.9) !important;
        box-shadow: 0 0 8px rgba(251, 191, 36, 0.7) !important;
        animation-duration: 22s !important;
        animation-delay: 3s !important;
    }

    #sapo-login-page .lp-particle-3 {
        left: 44% !important;
        bottom: -20px !important;
        width: 4px !important;
        height: 4px !important;
        animation-duration: 19s !important;
        animation-delay: 6s !important;
    }

    #sapo-login-page .lp-particle-4 {
        left: 62% !important;
        bottom: -20px !important;
        width: 3px !important;
        height: 3px !important;
        background: rgba(251, 191, 36, 0.9) !important;
        box-shadow: 0 0 8px rgba(251, 191, 36, 0.7) !important;
        animation-duration: 24s !important;
        animation-delay: 1.5s !important;
    }

    #sapo-login-page .lp-particle-5 {
        left: 78% !important;
        bottom: -20px !important;
        width: 5px !important;
        height: 5px !important;
        animation-duration: 20s !important;
        animation-delay: 9s !important;
    }

    #sapo-login-page .lp-particle-6 {
        left: 90% !important;
        bottom: -20px !important;
        width: 3px !important;
        height: 3px !important;
        animation-duration: 23s !important;
        animation-delay: 4.5s !important;
    }

    /* rotating conic accent */
    #sapo-login-page .lp-bg-conic {
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        width: 1400px !important;
        height: 1400px !important;
        margin: -700px 0 0 -700px !important;
        background:
            conic-gradient(
                from 0deg,
                transparent 0deg,
                rgba(74, 222, 128, 0.06) 60deg,
                transparent 120deg,
                transparent 240deg,
                rgba(251, 191, 36, 0.05) 300deg,
                transparent 360deg
            ) !important;
        animation: lp-rotate-slow 60s linear infinite !important;
    }

    /* =========================================================
       CENTERED CARD
       ========================================================= */
    #sapo-login-page .lp-card {
        position: relative !important;
        z-index: 2 !important;
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        max-width: 440px !important;
        padding: 40px 36px 32px !important;
        background:
            linear-gradient(
                180deg,
                rgba(255, 255, 255, 0.98) 0%,
                rgba(250, 253, 251, 0.98) 100%
            ) !important;
        border: 1px solid rgba(255, 255, 255, 0.55) !important;
        border-radius: 22px !important;
        box-shadow:
            0 40px 100px -20px rgba(0, 0, 0, 0.55),
            0 18px 40px -14px rgba(0, 0, 0, 0.32),
            inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
        backdrop-filter: blur(14px) !important;
        -webkit-backdrop-filter: blur(14px) !important;
        animation:
            lp-scale-in 0.8s
            cubic-bezier(0.16, 1, 0.3, 1) both !important;
    }

    /* glowing top border accent */
    #sapo-login-page .lp-card::before {
        content: '' !important;
        position: absolute !important;
        top: -1px !important;
        left: 15% !important;
        right: 15% !important;
        height: 2px !important;
        background:
            linear-gradient(
                90deg,
                transparent,
                rgba(34, 197, 94, 0.75),
                rgba(251, 191, 36, 0.75),
                rgba(34, 197, 94, 0.75),
                transparent
            ) !important;
        border-radius: 2px !important;
    }

    /* =========================================================
       BRAND
       ========================================================= */
    #sapo-login-page .lp-brand {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 14px !important;
        text-align: center !important;
        margin-bottom: 26px !important;
        animation:
            lp-fade-up 0.7s 0.12s
            cubic-bezier(0.16, 1, 0.3, 1) both !important;
    }

    #sapo-login-page .lp-brand-mark {
        position: relative !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 62px !important;
        height: 62px !important;
        font-size: 24px !important;
        font-weight: 800 !important;
        color: #ffffff !important;
        background:
            linear-gradient(
                145deg,
                var(--lp-green-600),
                var(--lp-green-800)
            ) !important;
        border-radius: 18px !important;
        box-shadow:
            0 14px 30px -8px rgba(21, 128, 61, 0.65),
            inset 0 1px 0 rgba(255, 255, 255, 0.35) !important;
        animation: lp-pulse-ring 3.6s ease-out infinite !important;
    }

    #sapo-login-page .lp-brand-mark::after {
        content: '' !important;
        position: absolute !important;
        inset: 0 !important;
        border-radius: 18px !important;
        background:
            linear-gradient(
                145deg,
                rgba(255, 255, 255, 0.35),
                transparent 45%
            ) !important;
        pointer-events: none !important;
    }

    #sapo-login-page .lp-brand-name {
        font-size: 20px !important;
        font-weight: 800 !important;
        letter-spacing: -0.02em !important;
        color: var(--lp-text) !important;
    }

    #sapo-login-page .lp-brand-tagline {
        display: block !important;
        margin-top: 3px !important;
        font-size: 12.5px !important;
        font-weight: 500 !important;
        letter-spacing: 0.02em !important;
        color: var(--lp-muted) !important;
    }

    /* =========================================================
       HEADER
       ========================================================= */
    #sapo-login-page .lp-card-header {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 6px !important;
        margin-bottom: 22px !important;
        text-align: center !important;
        animation:
            lp-fade-up 0.7s 0.2s
            cubic-bezier(0.16, 1, 0.3, 1) both !important;
    }

    #sapo-login-page .lp-card-header h2 {
        font-size: 22px !important;
        font-weight: 800 !important;
        line-height: 1.25 !important;
        letter-spacing: -0.02em !important;
        color: var(--lp-text) !important;
    }

    #sapo-login-page .lp-card-header p {
        font-size: 13.5px !important;
        line-height: 1.55 !important;
        color: var(--lp-muted) !important;
    }

    /* =========================================================
       FORM
       ========================================================= */
    #sapo-login-page .lp-form {
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
    }

    #sapo-login-page .lp-alert {
        display: flex !important;
        align-items: flex-start !important;
        gap: 9px !important;
        padding: 11px 13px !important;
        border-radius: 10px !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        line-height: 1.5 !important;
        background: var(--lp-red-light) !important;
        border: 1px solid #fecaca !important;
        color: var(--lp-red) !important;
        animation:
            lp-slide-in 0.32s
            cubic-bezier(0.16, 1, 0.3, 1) both !important;
    }

    #sapo-login-page .lp-alert::before {
        content: '!' !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex: none !important;
        width: 17px !important;
        height: 17px !important;
        margin-top: 1px !important;
        font-size: 11px !important;
        font-weight: 800 !important;
        color: #ffffff !important;
        background: var(--lp-red) !important;
        border-radius: 50% !important;
    }

    #sapo-login-page .lp-field {
        display: flex !important;
        flex-direction: column !important;
        gap: 7px !important;
    }

    #sapo-login-page .lp-field:nth-of-type(1) {
        animation:
            lp-fade-up 0.55s 0.28s
            cubic-bezier(0.16, 1, 0.3, 1) both !important;
    }

    #sapo-login-page .lp-field:nth-of-type(2) {
        animation:
            lp-fade-up 0.55s 0.36s
            cubic-bezier(0.16, 1, 0.3, 1) both !important;
    }

    #sapo-login-page .lp-field-label {
        font-size: 12.5px !important;
        font-weight: 600 !important;
        letter-spacing: 0.01em !important;
        color: var(--lp-text-secondary) !important;
    }

    #sapo-login-page .lp-input-wrap {
        position: relative !important;
        display: flex !important;
        align-items: center !important;
    }

    #sapo-login-page .lp-input-icon {
        position: absolute !important;
        left: 13px !important;
        width: 17px !important;
        height: 17px !important;
        color: #94a3b8 !important;
        pointer-events: none !important;
        transition: color 0.18s ease !important;
    }

    #sapo-login-page .lp-field input {
        width: 100% !important;
        height: 48px !important;
        padding: 0 44px 0 40px !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        color: var(--lp-text) !important;
        background: #f8fbfa !important;
        border: 1.5px solid var(--lp-border) !important;
        border-radius: 11px !important;
        outline: none !important;
        transition:
            border-color 0.18s ease,
            box-shadow 0.18s ease,
            background 0.18s ease !important;
    }

    #sapo-login-page .lp-field input::placeholder {
        color: #9aa1ac !important;
        opacity: 1 !important;
        font-weight: 400 !important;
    }

    #sapo-login-page .lp-field input:hover:not(:disabled) {
        border-color: #b6c2d1 !important;
    }

    #sapo-login-page .lp-field input:focus {
        background: var(--lp-white) !important;
        border-color: var(--lp-green-600) !important;
        box-shadow:
            0 0 0 4px rgba(34, 197, 94, 0.15) !important;
    }

    #sapo-login-page .lp-input-wrap:focus-within .lp-input-icon {
        color: var(--lp-green-700) !important;
    }

    #sapo-login-page .lp-field input:disabled {
        background: #f1f5f9 !important;
        color: var(--lp-muted) !important;
        cursor: not-allowed !important;
    }

    #sapo-login-page .lp-field input:-webkit-autofill {
        -webkit-box-shadow:
            0 0 0 1000px #ffffff inset !important;
        -webkit-text-fill-color: var(--lp-text) !important;
    }

    /* password visibility toggle */
    #sapo-login-page .lp-toggle-visibility {
        position: absolute !important;
        right: 8px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 32px !important;
        height: 32px !important;
        padding: 0 !important;
        color: #94a3b8 !important;
        background: transparent !important;
        border: none !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition:
            color 0.15s ease,
            background 0.15s ease !important;
    }

    #sapo-login-page .lp-toggle-visibility:hover {
        color: var(--lp-green-700) !important;
        background: rgba(34, 197, 94, 0.10) !important;
    }

    #sapo-login-page .lp-toggle-visibility svg {
        width: 17px !important;
        height: 17px !important;
        display: block !important;
    }

    /* submit button */
    #sapo-login-page .lp-submit-button {
        position: relative !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 9px !important;
        width: 100% !important;
        height: 50px !important;
        margin-top: 8px !important;
        overflow: hidden !important;
        font-size: 15px !important;
        font-weight: 700 !important;
        letter-spacing: 0.01em !important;
        color: #ffffff !important;
        background:
            linear-gradient(
                135deg,
                var(--lp-green-700) 0%,
                var(--lp-green-600) 55%,
                var(--lp-green-500) 100%
            ) !important;
        border: none !important;
        border-radius: 11px !important;
        cursor: pointer !important;
        box-shadow:
            0 14px 28px -10px rgba(21, 128, 61, 0.70),
            inset 0 1px 0 rgba(255, 255, 255, 0.22) !important;
        transition:
            transform 0.16s ease,
            box-shadow 0.16s ease,
            filter 0.16s ease !important;
        animation:
            lp-fade-up 0.55s 0.44s
            cubic-bezier(0.16, 1, 0.3, 1) both !important;
    }

    #sapo-login-page .lp-submit-button::after {
        content: '' !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 55% !important;
        height: 100% !important;
        background:
            linear-gradient(
                100deg,
                transparent 0%,
                rgba(255, 255, 255, 0.40) 50%,
                transparent 100%
            ) !important;
        transform: translateX(-130%) !important;
        pointer-events: none !important;
    }

    #sapo-login-page .lp-submit-button:hover:not(:disabled) {
        transform: translateY(-2px) !important;
        filter: brightness(1.06) !important;
        box-shadow:
            0 20px 38px -12px rgba(21, 128, 61, 0.80),
            inset 0 1px 0 rgba(255, 255, 255, 0.22) !important;
    }

    #sapo-login-page .lp-submit-button:hover:not(:disabled)::after {
        animation: lp-shimmer 0.9s ease !important;
    }

    #sapo-login-page .lp-submit-button:active:not(:disabled) {
        transform: translateY(0) scale(0.99) !important;
    }

    #sapo-login-page .lp-submit-button:focus-visible {
        outline: none !important;
        box-shadow:
            0 0 0 4px rgba(34, 197, 94, 0.32),
            0 14px 28px -10px rgba(21, 128, 61, 0.70) !important;
    }

    #sapo-login-page .lp-submit-button:disabled {
        opacity: 0.72 !important;
        cursor: not-allowed !important;
        transform: none !important;
        box-shadow: none !important;
    }

    #sapo-login-page .lp-spinner {
        width: 16px !important;
        height: 16px !important;
        flex: none !important;
        border: 2px solid rgba(255, 255, 255, 0.35) !important;
        border-top-color: #ffffff !important;
        border-radius: 50% !important;
        animation: lp-spin 0.7s linear infinite !important;
    }

    /* =========================================================
       FOOTER
       ========================================================= */
    #sapo-login-page .lp-footer {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 7px !important;
        margin-top: 22px !important;
        font-size: 11.5px !important;
        font-weight: 500 !important;
        letter-spacing: 0.02em !important;
        color: var(--lp-muted) !important;
        text-align: center !important;
        animation:
            lp-fade-in 0.9s 0.6s ease both !important;
    }

    #sapo-login-page .lp-status-dot {
        display: inline-block !important;
        width: 7px !important;
        height: 7px !important;
        border-radius: 50% !important;
        background: var(--lp-green-500) !important;
        box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.20) !important;
    }

    #sapo-login-page .lp-footer strong {
        color: var(--lp-green-700) !important;
        font-weight: 700 !important;
    }

    /* =========================================================
       RESPONSIVE
       ========================================================= */
    @media (max-width: 480px) {
        #sapo-login-page {
            padding: 16px !important;
        }

        #sapo-login-page .lp-card {
            padding: 32px 24px 26px !important;
            border-radius: 18px !important;
        }

        #sapo-login-page .lp-brand-mark {
            width: 56px !important;
            height: 56px !important;
            font-size: 22px !important;
        }

        #sapo-login-page .lp-brand-name {
            font-size: 18px !important;
        }

        #sapo-login-page .lp-card-header h2 {
            font-size: 20px !important;
        }

        #sapo-login-page .lp-orb-a,
        #sapo-login-page .lp-orb-b {
            width: 340px !important;
            height: 340px !important;
        }
    }

    /* =========================================================
       REDUCED MOTION
       ========================================================= */
    @media (prefers-reduced-motion: reduce) {
        #sapo-login-page,
        #sapo-login-page .lp-card,
        #sapo-login-page .lp-brand,
        #sapo-login-page .lp-card-header,
        #sapo-login-page .lp-field,
        #sapo-login-page .lp-submit-button,
        #sapo-login-page .lp-footer,
        #sapo-login-page .lp-alert,
        #sapo-login-page .lp-spinner,
        #sapo-login-page .lp-orb,
        #sapo-login-page .lp-particle,
        #sapo-login-page .lp-bg-conic,
        #sapo-login-page .lp-brand-mark {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
        }

        #sapo-login-page .lp-submit-button:hover:not(:disabled) {
            transform: none !important;
        }
    }
`;

export default function LoginPage() {
    const navigate = useNavigate();

    const {
        login,
    } = useAuth();

    const [
        username,
        setUsername,
    ] = useState('');

    const [
        password,
        setPassword,
    ] = useState('');

    const [
        showPassword,
        setShowPassword,
    ] = useState(false);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState('');

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const handleSubmit =
        async (
            event: FormEvent<HTMLFormElement>,
        ): Promise<void> => {
            event.preventDefault();

            if (isSubmitting) {
                return;
            }

            setErrorMessage('');
            setIsSubmitting(true);

            try {
                const user = await login({
                    username,
                    password,
                });

                navigate(
                    getRoleHome(user.role),
                    {
                        replace: true,
                    },
                );
            } catch (error) {
                if (error instanceof ApiError) {
                    const usernameError =
                        error.errors
                            ?.username
                        ?.[0];

                    setErrorMessage(
                        usernameError ??
                        error.message,
                    );
                } else {
                    setErrorMessage(
                        'An unexpected error occurred while logging in.',
                    );
                }
            } finally {
                setIsSubmitting(false);
            }
        };

    return (
        <main id="sapo-login-page">
            <style>
                {loginPageStyles}
            </style>

            {/* ---------------- ANIMATED BACKGROUND ---------------- */}
            <div
                className="lp-bg"
                aria-hidden="true"
            >
                <div className="lp-bg-grid" />

                <span className="lp-orb lp-orb-a" />
                <span className="lp-orb lp-orb-b" />
                <span className="lp-orb lp-orb-c" />
                <span className="lp-orb lp-orb-d" />

                <div className="lp-bg-conic" />

                <span className="lp-particle lp-particle-1" />
                <span className="lp-particle lp-particle-2" />
                <span className="lp-particle lp-particle-3" />
                <span className="lp-particle lp-particle-4" />
                <span className="lp-particle lp-particle-5" />
                <span className="lp-particle lp-particle-6" />
            </div>

            {/* ---------------- CENTERED LOGIN CARD ---------------- */}
            <section className="lp-card">
                <div className="lp-brand">
                    <div className="lp-brand-mark">
                        S
                    </div>

                    <div>
                        <span className="lp-brand-name">
                            Samarakoon Agro POS
                        </span>

                        <span className="lp-brand-tagline">
                            Agricultural Retail Management System
                        </span>
                    </div>
                </div>

                <header className="lp-card-header">
                    <h2>Sign in to continue</h2>

                    <p>
                        Enter your username and password
                        to access the POS.
                    </p>
                </header>

                <form
                    className="lp-form"
                    onSubmit={(event) => {
                        void handleSubmit(event);
                    }}
                    aria-busy={isSubmitting}
                >
                    {errorMessage && (
                        <div
                            className="lp-alert"
                            role="alert"
                        >
                            {errorMessage}
                        </div>
                    )}

                    <div className="lp-field">
                        <label
                            className="lp-field-label"
                            htmlFor="lp-username"
                        >
                            Username
                        </label>

                        <div className="lp-input-wrap">
                            <svg
                                className="lp-input-icon"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>

                            <input
                                id="lp-username"
                                type="text"
                                value={username}
                                autoComplete="username"
                                placeholder="Enter username"
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    setUsername(
                                        event.target.value,
                                    );
                                }}
                                required
                            />
                        </div>
                    </div>

                    <div className="lp-field">
                        <label
                            className="lp-field-label"
                            htmlFor="lp-password"
                        >
                            Password
                        </label>

                        <div className="lp-input-wrap">
                            <svg
                                className="lp-input-icon"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <rect
                                    x="3"
                                    y="11"
                                    width="18"
                                    height="11"
                                    rx="2"
                                />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>

                            <input
                                id="lp-password"
                                type={
                                    showPassword
                                        ? 'text'
                                        : 'password'
                                }
                                value={password}
                                autoComplete="current-password"
                                placeholder="Enter password"
                                disabled={isSubmitting}
                                onChange={(event) => {
                                    setPassword(
                                        event.target.value,
                                    );
                                }}
                                required
                            />

                            <button
                                type="button"
                                className="lp-toggle-visibility"
                                aria-label={
                                    showPassword
                                        ? 'Hide password'
                                        : 'Show password'
                                }
                                aria-pressed={showPassword}
                                tabIndex={-1}
                                onMouseDown={(event) => {
                                    event.preventDefault();
                                }}
                                onClick={() => {
                                    setShowPassword(
                                        (previous) =>
                                            !previous,
                                    );
                                }}
                            >
                                {showPassword ? (
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                                        <line
                                            x1="1"
                                            y1="1"
                                            x2="23"
                                            y2="23"
                                        />
                                    </svg>
                                ) : (
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle
                                            cx="12"
                                            cy="12"
                                            r="3"
                                        />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="lp-submit-button"
                        disabled={isSubmitting}
                    >
                        {isSubmitting && (
                            <span
                                className="lp-spinner"
                                aria-hidden="true"
                            />
                        )}

                        {isSubmitting
                            ? 'Signing in...'
                            : 'Sign In'}
                    </button>
                </form>

                <footer className="lp-footer">
                    <span
                        className="lp-status-dot"
                        aria-hidden="true"
                    />

                    <span>
                        © {new Date().getFullYear()}{' '}
                        <strong>
                            Samarakoon Agro POS
                        </strong>{' '}
                        · All systems operational
                    </span>
                </footer>
            </section>
        </main>
    );
}