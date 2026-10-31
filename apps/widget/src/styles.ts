// Feuille de style du Shadow DOM. `:host { all: initial }` coupe l'héritage
// (police, couleur, interlignage…) du site hôte ; ses sélecteurs `button`, `input`
// ne traversent pas le Shadow DOM.
export const CSS = `
:host{all:initial;
  --accent:#24533F;--accent2:#8E2C3A;
  --accent-light:color-mix(in srgb,var(--accent) 12%,#fff);
  --accent-dark:color-mix(in srgb,var(--accent) 75%,#000);
  --accent2-light:color-mix(in srgb,var(--accent2) 10%,#fff);
  --on-accent-soft:color-mix(in srgb,#fff 80%,var(--accent));
  --bg:#FFFFFF;--surface:#F5F3EF;--text:#1C1B19;--muted:#5C5852;--faint:#6B665F;
  --line:#E7E3DC;--line-strong:#CFC9BF;--cream:#F2E8D5;
  --title:'Bricolage Grotesque',system-ui,sans-serif;--body:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;
}
:host([mode="page"]){display:block;min-height:100vh;min-height:100dvh}
*,*::before,*::after{box-sizing:border-box}
/* Un « * { … !important } » du site atteint l'hôte lui-même : on refixe tout ce qui s'hérite. */
.root{font-family:var(--body);font-size:14.5px;font-weight:400;font-style:normal;line-height:1.45;color:var(--text);-webkit-font-smoothing:antialiased;text-align:left;
  letter-spacing:normal;word-spacing:normal;text-transform:none;text-indent:0;text-shadow:none;white-space:normal;visibility:visible;direction:ltr}
button,input,textarea{font:inherit;color:inherit;margin:0;letter-spacing:normal;text-transform:none;box-shadow:none}
button{cursor:pointer;-webkit-appearance:none;appearance:none}
a{color:var(--accent)}a:hover{color:var(--accent-dark)}
h1,h2,p{margin:0}
:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

/* Bulle et panneau */
.launcher{position:fixed;right:24px;bottom:24px;z-index:2147483000;display:flex;align-items:center;gap:10px;height:56px;padding:0 22px 0 18px;border:0;border-radius:999px;background:var(--accent);color:#fff;font-weight:600;font-size:15px;box-shadow:0 12px 32px rgba(28,27,25,.25)}
.launcher:focus-visible{outline-color:var(--text)}
.backdrop{position:fixed;inset:0;z-index:2147483000;background:rgba(28,27,25,.18)}
.panel{position:fixed;right:32px;bottom:32px;z-index:2147483001;width:400px;height:min(680px,calc(100vh - 64px));border-radius:24px;background:var(--bg);box-shadow:0 24px 64px rgba(28,27,25,.22);display:flex;flex-direction:column;overflow:hidden}
.page{min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;background:var(--bg);max-width:560px;margin:0 auto}
.page.is-surface,.panel .body.is-surface{background:var(--surface)}
@media (max-width:480px){.panel{inset:0;width:auto;height:auto;border-radius:0}.launcher{right:16px;bottom:16px}}

.head{display:flex;align-items:center;gap:12px;padding:18px 20px;background:var(--accent);color:#fff}
.head.light{background:var(--bg);color:var(--text);border-bottom:1px solid var(--line);padding:10px 12px;gap:8px}
.head :focus-visible{outline-color:#fff}.head.light :focus-visible{outline-color:var(--accent)}
.avatar{width:40px;height:40px;flex-shrink:0;border-radius:999px;background:var(--cream);color:var(--accent);display:flex;align-items:center;justify-content:center;font-family:var(--title);font-weight:700;font-size:17px}
.head-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.head-title{font-weight:600;font-size:15px}
.head-sub{font-size:12.5px;color:var(--on-accent-soft)}.head.light .head-sub{color:var(--muted)}
.icon-btn{width:44px;height:44px;flex-shrink:0;border:0;border-radius:999px;background:transparent;color:inherit;display:flex;align-items:center;justify-content:center}
.icon-btn:hover{background:rgba(255,255,255,.12)}.head.light .icon-btn:hover{background:var(--surface)}

.body{flex:1;min-height:0;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:18px}
.body.tight{padding:14px 16px;gap:12px}
.foot{padding:14px 16px 12px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:10px}
.legal{font-size:11.5px;line-height:1.4;color:var(--faint);text-align:center}
.page .legal{padding:12px 20px 18px;font-size:11px}

/* Conversation */
.bubble{align-self:flex-start;max-width:300px;padding:12px 14px;border-radius:16px 16px 16px 4px;background:var(--surface);font-size:14.5px}
.bubble.me{align-self:flex-end;max-width:280px;padding:10px 14px;border-radius:16px 16px 4px 16px;background:var(--accent);color:#fff;font-size:14px}
.tight .bubble{padding:10px 14px;font-size:14px;max-width:320px}
.dots::after{content:"…";display:inline-block;animation:blink 1.2s infinite}
@keyframes blink{50%{opacity:.2}}
@media (prefers-reduced-motion:reduce){.dots::after{animation:none}}

/* Choix */
.group{display:flex;flex-direction:column;gap:8px;border:0;padding:0;margin:0;min-width:0}
.label{font-size:12.5px;font-weight:600;color:var(--muted);padding:0}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{position:relative;height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--line-strong);background:var(--bg);color:var(--text);font-weight:500;font-size:13.5px;white-space:nowrap}
/* Cible tactile de 44 px autour d'une puce de 36 px. */
.chip::after,.budget::after{content:"";position:absolute;inset:-4px 0}
.chip:hover{border-color:var(--accent)}
.chip[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:#fff}
.budgets{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.budget{position:relative;height:40px;border-radius:12px;border:1px solid var(--line-strong);background:var(--bg);color:var(--text);font-weight:500;font-size:13.5px;padding:0 4px}
.budget[aria-pressed="true"]{border-color:var(--accent);background:var(--accent-light);color:var(--accent-dark);font-weight:600}
.ask{display:flex;gap:8px;align-items:center}
.ask input{flex:1;min-width:0;height:46px;padding:0 14px;border-radius:999px;border:1px solid var(--line-strong);background:var(--bg);font-size:14px}
.send{width:46px;height:46px;flex-shrink:0;border:0;border-radius:999px;background:var(--accent2);color:#fff;display:flex;align-items:center;justify-content:center}

/* Page hébergée */
.hero{padding:20px 20px 28px;background:var(--accent);color:#fff;display:flex;flex-direction:column;gap:18px}
.hero-top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.hero-shop{font-family:var(--title);font-weight:700;font-size:19px}
.hero-hours{font-size:12px;color:var(--on-accent-soft)}
.hero h1{font-family:var(--title);font-weight:700;font-size:34px;line-height:1.05;letter-spacing:-.8px}
.hero p{font-size:15px;line-height:1.5;color:var(--on-accent-soft)}
.page-body{padding:20px;display:flex;flex-direction:column;gap:20px;flex:1}
textarea{height:96px;padding:12px 14px;border-radius:16px;border:1px solid var(--line-strong);background:var(--bg);font-size:15px;line-height:1.45;resize:none;width:100%}
.btn{display:flex;align-items:center;justify-content:center;gap:8px;min-height:50px;padding:0 20px;border-radius:999px;border:1px solid transparent;font-weight:600;font-size:15px;text-decoration:none;text-align:center}
.btn.primary{background:var(--accent2);color:#fff}
.btn.dark{background:var(--text);color:#fff}.btn.dark:hover{color:#fff}
.btn.ghost{background:var(--bg);border-color:var(--line-strong);color:var(--text)}
.btn[disabled]{opacity:.6;cursor:progress}
.idea{display:flex;align-items:center;gap:12px;min-height:56px;padding:0 16px;border-radius:16px;border:1px solid var(--line);background:var(--surface);color:var(--text);font-weight:500;font-size:14.5px;text-align:left;width:100%}
.idea svg,.note svg{color:var(--accent);flex-shrink:0}
.note{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:16px;background:var(--accent-light);font-size:13.5px;line-height:1.4;color:var(--accent-dark)}
.page-body .note{margin-top:auto}

/* Produits */
.card{display:flex;gap:12px;padding:12px;border-radius:16px;border:1px solid var(--line);background:var(--bg)}
.thumb{width:56px;flex-shrink:0;border-radius:10px;background:var(--accent2-light);color:var(--accent2);display:flex;align-items:center;justify-content:center;min-height:84px}
.card-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.row{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.name{font-weight:600;font-size:14.5px;margin:0}
.price{font-weight:600;font-size:14.5px;white-space:nowrap}
.meta{font-size:12.5px;color:var(--muted)}
.quote{font-size:13px;line-height:1.4}
.card-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px}
.stock{font-size:12px;font-weight:600;color:var(--accent)}
.reserve{position:relative;height:36px;padding:0 14px;border-radius:999px;border:0;background:var(--accent2);color:#fff;font-weight:600;font-size:13px;white-space:nowrap}
.reserve::after{content:"";position:absolute;inset:-4px 0}

/* Formulaire de mise de côté */
.form{display:flex;flex-direction:column;gap:16px}
.field{display:flex;flex-direction:column;gap:6px}
.field input[type=text],.field input[type=tel]{height:46px;padding:0 14px;border-radius:12px;border:1px solid var(--line-strong);background:var(--bg);font-size:15px;width:100%}
.field input[aria-invalid="true"]{border-color:var(--accent2)}
.days{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.day{position:relative;display:flex;flex-direction:column;justify-content:center;min-height:52px;padding:6px 12px;border-radius:12px;border:1px solid var(--line-strong);background:var(--bg);cursor:pointer}
.day input{position:absolute;opacity:0;width:1px;height:1px}
.day:has(input:checked){border-color:var(--accent);background:var(--accent-light)}
.day:has(input:focus-visible){outline:3px solid var(--accent);outline-offset:2px}
.day-label{font-weight:600;font-size:14px}.day-until{font-size:12px;color:var(--muted)}
.check{display:flex;align-items:center;gap:10px;min-height:44px;font-size:14px;cursor:pointer}
.check input{width:20px;height:20px;accent-color:var(--accent);margin:0}
.error{font-size:13px;color:var(--accent2);font-weight:600}
.small{font-size:12.5px;color:var(--muted);line-height:1.45}

/* Confirmation */
.done{display:flex;flex-direction:column;align-items:center;gap:14px;padding:28px 8px 24px;text-align:center}
.done-icon{width:64px;height:64px;border-radius:999px;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center}
.done h2,.title{font-family:var(--title);font-weight:700;font-size:30px;line-height:1.1;letter-spacing:-.6px}
.title{font-size:22px;letter-spacing:-.3px}
.done p{font-size:15px;line-height:1.5;color:var(--muted)}
.ticket{background:var(--bg);border-radius:20px;padding:18px;display:flex;flex-direction:column;gap:14px}
.ticket .thumb{width:48px;min-height:64px}
.sep{height:1px;background:var(--line)}
.facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:0}
.facts div{display:flex;flex-direction:column;gap:3px}
.facts dt{font-size:12px;color:var(--muted)}.facts dd{margin:0;font-size:14px;font-weight:600}
.actions{display:flex;flex-direction:column;gap:10px}
.center{text-align:center;font-size:13px;color:var(--muted)}
`;
