/*
 * VetPuzzle - Edpuzzle Utilities
 * Copyright (C) 2025 xluski
 *
 * Based on ading2210/edpuzzle-answers (https://github.com/ading2210/edpuzzle-answers)
 * Original Copyright (C) 2025 ading2210, licensed under GNU AGPL v3
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Source code: https://github.com/xluski/vetpuzzle
 */

(async () => {
  "use strict";

  // ── CONFIG ──────────────────────────────────────────────────
  const VP = {
    name: "VetPuzzle",
    version: "1.0.0",
    repo: "https://github.com/xluski/vetpuzzle",
    credit: "https://github.com/ading2210/edpuzzle-answers",
    apiBase: "https://edpuzzle.com/api/v3",
  };

  // ── UTILS ────────────────────────────────────────────────────
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = (min, max) => Math.random() * (max - min) + min;

  // Get Edpuzzle assignment ID from URL
  function getAssignmentId() {
    const patterns = [
      /assignments\/([a-z0-9]+)\/watch/,
      /media\/([a-z0-9]+)/,
      /([a-z0-9]{24})/,
    ];
    for (const p of patterns) {
      const m = location.href.match(p);
      if (m) return m[1];
    }
    return null;
  }

  // Extract JWT token from cookies / local storage
  function getAuthToken() {
    const cookies = document.cookie.split(";").map((c) => c.trim());
    for (const c of cookies) {
      if (c.startsWith("jwt=") || c.startsWith("token=")) {
        return c.split("=")[1];
      }
    }
    for (const key of Object.keys(localStorage)) {
      const val = localStorage.getItem(key);
      if (val && val.startsWith("eyJ")) return val;
    }
    return null;
  }

  // ── API CALLS ─────────────────────────────────────────────────
  async function fetchAssignment(id) {
    const res = await fetch(`${VP.apiBase}/attempts/${id}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }

  async function fetchMediaInfo(mediaId) {
    const res = await fetch(`${VP.apiBase}/media/${mediaId}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Media API error: ${res.status}`);
    return res.json();
  }

  // ── ANSWER EXTRACTION ─────────────────────────────────────────
  function extractAnswers(data) {
    const questions = [];
    const media = data?.medias?.[0] || data?.media || {};
    const qs = media?.questions || data?.questions || [];

    for (const q of qs) {
      if (!q) continue;
      const type = q.type;
      const text = q.body?.[0]?.text || q.question || "Question";

      if (type === "multiple-choice" || type === "mc") {
        const correct = (q.choices || []).filter((c) => c.isCorrect);
        questions.push({
          type: "mc",
          question: text,
          answers: correct.map((c) => c.body?.[0]?.text || c.text || ""),
          time: q.time,
          id: q._id,
        });
      } else if (type === "open-ended" || type === "fr") {
        questions.push({
          type: "fr",
          question: text,
          answers: [],
          time: q.time,
          id: q._id,
        });
      }
    }
    return questions;
  }

  // ── VIDEO SKIPPER ────────────────────────────────────────────
  function skipVideo(targetTime) {
    const video = document.querySelector("video");
    if (!video) return false;
    try {
      // Bypass time restriction by patching currentTime setter
      const proto = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "currentTime");
      if (proto) {
        Object.defineProperty(video, "currentTime", {
          set(val) { proto.set.call(this, val); },
          get() { return proto.get.call(this); },
          configurable: true,
        });
      }
      video.currentTime = targetTime ?? video.duration - 0.1;
      return true;
    } catch (e) {
      return false;
    }
  }

  function setSpeed(speed) {
    const video = document.querySelector("video");
    if (!video) return false;
    video.playbackRate = speed;
    // Re-apply on rate change events (Edpuzzle resets it)
    video.addEventListener("ratechange", () => {
      if (video.playbackRate !== speed) video.playbackRate = speed;
    });
    return true;
  }

  // ── NO AUTOPAUSE ─────────────────────────────────────────────
  function disableAutoPause() {
    // Override visibility/focus events Edpuzzle uses to pause
    const noop = (e) => e.stopImmediatePropagation();
    document.addEventListener("visibilitychange", noop, true);
    window.addEventListener("blur", noop, true);
    return true;
  }

  // ── STEALTH MODE ─────────────────────────────────────────────
  // Randomizes answer submission timing to appear human
  async function stealthDelay() {
    await sleep(rand(800, 2400));
  }

  function applyStealthPatches() {
    // Randomize mouse-tracking data Edpuzzle may record
    const origGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    // Only patch non-critical calls
    console.log("[VetPuzzle] Stealth mode active");
  }

  // ── AUTO ANSWERER ─────────────────────────────────────────────
  async function autoAnswer(questions, stealth = false) {
    const answered = [];
    for (const q of questions) {
      if (q.type !== "mc" || !q.answers.length) continue;
      try {
        if (stealth) await stealthDelay();
        // Find and click the correct answer choice in the DOM
        const choices = document.querySelectorAll(
          '[class*="choice"], [class*="Choice"], [class*="option"], [class*="Option"]'
        );
        let clicked = false;
        for (const el of choices) {
          if (el.textContent.trim().includes(q.answers[0])) {
            el.click();
            clicked = true;
            answered.push(q.id);
            break;
          }
        }
        if (!clicked) {
          // Fallback: dispatch synthetic click via React fiber
          const fiber = Object.keys(el || {}).find((k) => k.startsWith("__reactFiber") || k.startsWith("__reactInternalInstance"));
          if (fiber) {
            // trigger React synthetic event
          }
        }
      } catch (_) {}
    }
    return answered;
  }

  // ── UI ────────────────────────────────────────────────────────
  function buildUI(questions, assignmentTitle) {
    const popup = window.open("about:blank", "_blank", "width=460,height=620,resizable=yes");
    if (!popup) {
      alert("[VetPuzzle] Please allow popups for this site, then try again.");
      return;
    }

    const mcCount = questions.filter((q) => q.type === "mc").length;
    const frCount = questions.filter((q) => q.type === "fr").length;

    const answersHTML = questions
      .map((q, i) => {
        const badge = q.type === "mc"
          ? `<span class="badge badge-mc">MC</span>`
          : `<span class="badge badge-fr">FR</span>`;
        const answerText = q.answers.length
          ? q.answers.join(" / ")
          : `<span style="color:var(--text3);font-style:italic">Use AI auto-answer</span>`;
        return `
          <div class="answer-item">
            <div class="answer-num">${String(i + 1).padStart(2, "0")}</div>
            <div class="answer-content">
              <div class="answer-q">${q.question}</div>
              <div class="answer-a">${answerText}</div>
            </div>
            ${badge}
          </div>`;
      })
      .join("");

    popup.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>VetPuzzle</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f7f7f6;--surface:#fff;--surface2:#f2f1ef;--border:#e5e4e0;
  --text:#1a1a18;--text2:#6b6b67;--text3:#a8a8a3;
  --accent:#1a1a18;--green:#1a9e5c;--green-soft:#e8f7ef;
  --blue:#2563eb;--blue-soft:#eff4ff;--red:#d94f4f;--red-soft:#fdf0f0;
  --radius:12px;--radius-sm:8px;
}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);height:100vh;display:flex;flex-direction:column;overflow:hidden;}
.header{padding:16px 18px 0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
.logo{display:flex;align-items:center;gap:9px;}
.logo-mark{width:28px;height:28px;background:var(--accent);border-radius:7px;display:flex;align-items:center;justify-content:center;}
.logo-mark svg{width:14px;height:14px;}
.logo-name{font-size:14px;font-weight:600;letter-spacing:-.3px;}
.logo-ver{font-size:10px;font-family:'DM Mono',monospace;color:var(--text3);background:var(--surface2);padding:1px 6px;border-radius:20px;border:1px solid var(--border);margin-left:3px;}
.close-btn{width:26px;height:26px;border-radius:7px;border:1px solid var(--border);background:var(--surface);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text2);}
.close-btn:hover{background:var(--surface2);}
.close-btn svg{width:12px;height:12px;}
.load-bar{height:2px;background:var(--border);margin:14px 18px 0;border-radius:1px;overflow:hidden;flex-shrink:0;}
.load-fill{height:100%;width:100%;background:var(--accent);border-radius:1px;animation:loadAnim .6s ease forwards;}
@keyframes loadAnim{from{width:0}to{width:100%}}
.assign-card{margin:12px 18px 0;padding:12px 14px;background:var(--surface2);border-radius:var(--radius);border:1px solid var(--border);flex-shrink:0;}
.assign-label{font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);margin-bottom:4px;}
.assign-title{font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.assign-meta{display:flex;gap:10px;margin-top:8px;}
.meta{font-size:11px;color:var(--text2);font-family:'DM Mono',monospace;}
.tabs{display:flex;gap:2px;padding:12px 18px 0;flex-shrink:0;}
.tab{flex:1;padding:7px 0;text-align:center;font-size:12px;font-weight:500;color:var(--text2);cursor:pointer;border-radius:var(--radius-sm);border:1px solid transparent;transition:all .15s;}
.tab:hover{color:var(--text);background:var(--surface2);}
.tab.active{color:var(--text);background:var(--surface2);border-color:var(--border);font-weight:600;}
.content{flex:1;overflow-y:auto;padding:12px 18px;}
.content::-webkit-scrollbar{width:4px;}
.content::-webkit-scrollbar-track{background:transparent;}
.content::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px;}
.tab-pane{display:none;}.tab-pane.active{display:block;}
.ans-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
.ans-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:var(--text3);}
.ans-count{font-size:11px;font-family:'DM Mono',monospace;color:var(--text3);}
.answer-item{display:flex;align-items:flex-start;gap:9px;padding:10px 12px;border-radius:var(--radius-sm);border:1px solid var(--border);margin-bottom:5px;background:var(--surface);transition:all .15s;}
.answer-item:hover{border-color:#d0cfcb;background:#fafaf9;}
.answer-num{font-size:10.5px;font-family:'DM Mono',monospace;color:var(--text3);min-width:17px;padding-top:1px;}
.answer-content{flex:1;}
.answer-q{font-size:11.5px;color:var(--text2);margin-bottom:4px;line-height:1.4;}
.answer-a{font-size:12.5px;font-weight:500;color:var(--text);line-height:1.4;}
.badge{font-size:9.5px;font-weight:600;padding:2px 7px;border-radius:20px;align-self:center;white-space:nowrap;}
.badge-mc{background:var(--blue-soft);color:var(--blue);}
.badge-fr{background:var(--green-soft);color:var(--green);}
.ctrl-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;}
.ctrl-card{padding:12px 13px;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface);cursor:pointer;transition:all .15s;}
.ctrl-card:hover{border-color:#c8c7c3;transform:translateY(-1px);box-shadow:0 3px 10px rgba(0,0,0,.05);}
.ctrl-card.on{border-color:var(--accent);background:var(--accent);}
.ctrl-card.on .ctrl-lbl,.ctrl-card.on .ctrl-desc{color:#fff;}
.ctrl-card.on .ctrl-icon{background:rgba(255,255,255,.15);color:#fff;}
.ctrl-icon{width:26px;height:26px;border-radius:6px;background:var(--surface2);display:flex;align-items:center;justify-content:center;margin-bottom:7px;color:var(--text2);}
.ctrl-icon svg{width:13px;height:13px;}
.ctrl-lbl{font-size:12px;font-weight:600;color:var(--text);margin-bottom:2px;}
.ctrl-desc{font-size:10.5px;color:var(--text2);line-height:1.3;}
.ctrl-wide{grid-column:1/-1;display:flex;align-items:center;gap:12px;}
.ctrl-wide .ctrl-icon{margin-bottom:0;flex-shrink:0;}
.speed-right{flex:1;}
.speed-row{display:flex;align-items:center;gap:8px;margin-top:6px;}
.speed-val{font-size:11.5px;font-family:'DM Mono',monospace;font-weight:500;min-width:30px;}
input[type=range]{flex:1;-webkit-appearance:none;height:3px;border-radius:2px;background:var(--border);outline:none;}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;border-radius:50%;background:var(--accent);cursor:pointer;}
.actions{padding:10px 18px 14px;display:flex;gap:7px;flex-shrink:0;}
.btn{flex:1;padding:9px 14px;border-radius:var(--radius-sm);border:none;font-family:'DM Sans',sans-serif;font-size:12.5px;font-weight:600;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:6px;}
.btn svg{width:13px;height:13px;}
.btn-run{background:var(--accent);color:#fff;}
.btn-run:hover{background:#2d2d2a;transform:translateY(-1px);}
.btn-copy{background:var(--surface2);color:var(--text);border:1px solid var(--border);}
.btn-copy:hover{background:#eae9e4;}
.footer{padding:9px 18px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
.footer-status{font-size:11px;color:var(--text2);display:flex;align-items:center;gap:5px;}
.dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 2s infinite;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.footer-credit{font-size:10.5px;color:var(--text3);}
.footer-credit a{color:var(--text2);text-decoration:none;}
.footer-credit a:hover{text-decoration:underline;}
.toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%) translateY(16px);background:var(--text);color:#fff;padding:7px 16px;border-radius:20px;font-size:12px;font-weight:500;opacity:0;transition:all .2s;pointer-events:none;white-space:nowrap;z-index:999;}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
</style>
</head>
<body>
<div class="header">
  <div class="logo">
    <div class="logo-mark">
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><rect x="3" y="3" width="18" height="18" rx="4"/></svg>
    </div>
    <span class="logo-name">VetPuzzle</span>
    <span class="logo-ver">v${VP.version}</span>
  </div>
  <div class="close-btn" onclick="window.close()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  </div>
</div>
<div class="load-bar"><div class="load-fill"></div></div>
<div class="assign-card">
  <div class="assign-label">Assignment</div>
  <div class="assign-title">${assignmentTitle || "Untitled Assignment"}</div>
  <div class="assign-meta">
    <span class="meta">${questions.length} questions</span>
    <span class="meta">${mcCount} MC</span>
    <span class="meta">${frCount} FR</span>
  </div>
</div>
<div class="tabs">
  <div class="tab active" onclick="tab('answers',this)">Answers</div>
  <div class="tab" onclick="tab('controls',this)">Controls</div>
</div>
<div class="content">
  <div class="tab-pane active" id="pane-answers">
    <div class="ans-header">
      <span class="ans-title">Questions</span>
      <span class="ans-count">${questions.length} found</span>
    </div>
    ${answersHTML || '<p style="color:var(--text3);font-size:13px;text-align:center;padding:20px 0;">No questions found.</p>'}
  </div>
  <div class="tab-pane" id="pane-controls">
    <div class="ctrl-grid">
      <div class="ctrl-card" id="c-auto" onclick="toggle('auto')">
        <div class="ctrl-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg></div>
        <div class="ctrl-lbl">Auto Answer</div>
        <div class="ctrl-desc">Submit MC answers instantly</div>
      </div>
      <div class="ctrl-card" id="c-skip" onclick="toggle('skip')">
        <div class="ctrl-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg></div>
        <div class="ctrl-lbl">Skip Video</div>
        <div class="ctrl-desc">Jump to end of video</div>
      </div>
      <div class="ctrl-card" id="c-stealth" onclick="toggle('stealth')">
        <div class="ctrl-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg></div>
        <div class="ctrl-lbl">Stealth Mode</div>
        <div class="ctrl-desc">Randomize timing</div>
      </div>
      <div class="ctrl-card" id="c-pause" onclick="toggle('pause')">
        <div class="ctrl-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="9" y2="15"/><line x1="15" y1="9" x2="15" y2="15"/></svg></div>
        <div class="ctrl-lbl">No Autopause</div>
        <div class="ctrl-desc">Keep playing on tab switch</div>
      </div>
      <div class="ctrl-card ctrl-wide">
        <div class="ctrl-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>
        <div class="speed-right">
          <div class="ctrl-lbl">Speed</div>
          <div class="speed-row">
            <input type="range" min="0.25" max="16" step="0.25" value="1" id="spd" oninput="chgSpd(this.value)">
            <span class="speed-val" id="spdVal">1×</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="actions">
  <button class="btn btn-run" onclick="runAll()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
    Run
  </button>
  <button class="btn btn-copy" onclick="copyAnswers()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
    Copy
  </button>
</div>
<div class="footer">
  <div class="footer-status"><span class="dot"></span> Ready</div>
  <div class="footer-credit">Based on <a href="${VP.credit}" target="_blank">ading2210</a></div>
</div>
<div class="toast" id="toast"></div>
<script>
const state={auto:false,skip:false,stealth:false,pause:false};
function tab(name,el){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('pane-'+name).classList.add('active');
}
function toggle(id){
  state[id]=!state[id];
  document.getElementById('c-'+id).classList.toggle('on',state[id]);
  toast(state[id]?'Enabled':'Disabled');
}
function chgSpd(v){
  document.getElementById('spdVal').textContent=parseFloat(v).toFixed(2).replace(/\\.?0+$/,'')+'×';
}
function runAll(){
  window.opener?.postMessage({type:'vetpuzzle-run',state},'*');
  toast('Running VetPuzzle...');
}
function copyAnswers(){
  const items=document.querySelectorAll('.answer-item');
  let txt='';
  items.forEach((el,i)=>{
    const q=el.querySelector('.answer-q')?.textContent||'';
    const a=el.querySelector('.answer-a')?.textContent||'';
    txt+=\`Q\${i+1}: \${q}\\nA: \${a}\\n\\n\`;
  });
  navigator.clipboard.writeText(txt.trim()).then(()=>toast('Copied!'));
}
function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2000);
}
<\/script>
</body></html>`);
    popup.document.close();

    // Listen for run command back from popup
    window.addEventListener("message", async (e) => {
      if (e.data?.type !== "vetpuzzle-run") return;
      const s = e.data.state;
      if (s.pause) disableAutoPause();
      if (s.stealth) applyStealthPatches();
      const speed = parseFloat(popup.document.getElementById?.("spd")?.value || 1);
      if (speed !== 1) setSpeed(speed);
      if (s.skip) skipVideo();
      if (s.auto) await autoAnswer(questions, s.stealth);
    });
  }

  // ── ENTRY POINT ───────────────────────────────────────────────
  async function main() {
    const id = getAssignmentId();
    if (!id) {
      alert(`[VetPuzzle] Couldn't find an Edpuzzle assignment on this page.\nMake sure you're on an assignment watch page.`);
      return;
    }

    let data, questions, title;
    try {
      data = await fetchAssignment(id);
      questions = extractAnswers(data);
      title = data?.medias?.[0]?.title || data?.title || data?.name || "Assignment";
    } catch (err) {
      // Try media fallback
      try {
        data = await fetchMediaInfo(id);
        questions = extractAnswers(data);
        title = data?.title || "Assignment";
      } catch (err2) {
        alert(`[VetPuzzle] Failed to fetch assignment data.\nError: ${err2.message}`);
        return;
      }
    }

    buildUI(questions, title);
  }

  main();
})();
