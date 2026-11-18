(() => {
  const S = window.SITE || {};
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const celular = matchMedia("(max-width: 760px)").matches;
  const raiz = document.documentElement;

  /* ── Altura real da tela (barras do navegador do celular incluídas) ─── */
  const medirVh = () => raiz.style.setProperty("--vh", `${innerHeight}px`);
  medirVh();

  /* ══ ABERTURA: vídeo contínuo, sem pausas ══════════════════════════ */
  // Toca sozinho ao carregar; cada mensagem entra num instante do vídeo e permanece.
  const cine = document.querySelector(".cine");
  const video = cine && cine.querySelector(".cine-video");
  const momentos = cine ? [...cine.querySelectorAll(".momento")] : [];
  const A = S.abertura || {};
  const instante = (m) => { const v = m.dataset.em; return v in A ? A[v] : parseFloat(v) || 0; };

  if (video) {
    if (celular) { video.poster = video.dataset.posterMobile; video.src = video.dataset.mobile; }
    else video.src = video.dataset.desktop;
    video.muted = true; // exigido pelos navegadores para tocar sozinho
    video.defaultPlaybackRate = video.playbackRate = S.abertura && S.abertura.velocidade || 2.1;
    video.addEventListener("loadedmetadata", () => { video.playbackRate = video.defaultPlaybackRate; });

    const mostrarTudo = () => { momentos.forEach((m) => m.classList.add("ativo")); cine.classList.add("terminou"); };
    const conferir = () => {
      const t = video.currentTime;
      momentos.forEach((m) => { if (t >= instante(m)) m.classList.add("ativo"); });
      if (momentos.every((m) => m.classList.contains("ativo"))) cine.classList.add("terminou");
    };
    // Confere a cada quadro do vídeo (preciso); "timeupdate" cobre navegadores sem esse recurso
    if (video.requestVideoFrameCallback) {
      const quadro = () => { conferir(); if (!video.ended) video.requestVideoFrameCallback(quadro); };
      video.requestVideoFrameCallback(quadro);
    }
    video.addEventListener("timeupdate", conferir);
    // E a cada atualização da tela enquanto toca (~16 ms), para não depender de um só mecanismo
    const laco = () => { conferir(); if (!video.paused && !video.ended) requestAnimationFrame(laco); };
    video.addEventListener("playing", () => requestAnimationFrame(laco));

    if (reduzir) {
      video.removeAttribute("autoplay");
      video.addEventListener("loadedmetadata", () => { video.currentTime = video.duration; }, { once: true });
      mostrarTudo();
    } else {
      video.addEventListener("ended", mostrarTudo);
      const tocar = () => video.play().catch(() => mostrarTudo()); // modo economia de bateria etc.
      tocar();
      video.addEventListener("canplay", () => { if (video.paused && !video.ended) tocar(); }, { once: true });
    }
  }

  /* ══ TELAS: um deslize = uma tela inteira ════════════════════════════ */
  const trilho = document.querySelector(".trilho");
  const telas = [...trilho.querySelectorAll(":scope > .tela")];
  const topo = document.querySelector(".topo");
  const whats = document.querySelector(".whats");
  const pontos = document.querySelector(".pontos");
  const linksMenu = [...document.querySelectorAll(".menu a")];
  let indice = 0, travado = false, ultimoEvento = 0;

  telas.forEach((t, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", t.dataset.titulo || t.id);
    b.title = t.dataset.titulo || "";
    b.addEventListener("click", () => ir(i));
    pontos && pontos.appendChild(b);
  });

  const posicionar = (imediato) => {
    trilho.classList.toggle("sem-transicao", !!imediato);
    trilho.style.transform = `translate3d(0, ${-indice * innerHeight}px, 0)`;
    if (imediato) { trilho.offsetHeight; trilho.classList.remove("sem-transicao"); }
  };

  const atualizarUI = () => {
    const id = telas[indice].id;
    topo.classList.toggle("rolou", indice > 0);
    whats && whats.classList.toggle("visivel", indice > 0 && id !== "contato");
    pontos && [...pontos.children].forEach((b, i) => b.classList.toggle("atual", i === indice));
    linksMenu.forEach((a) => {
      const alvo = document.querySelector(a.getAttribute("href"));
      const tela = alvo && alvo.closest(".tela");
      a.classList.toggle("atual", !!tela && (tela === telas[indice] || (id.startsWith("servico") && a.getAttribute("href") === "#servicos")));
    });
  };

  function ir(i, imediato) {
    i = Math.max(0, Math.min(telas.length - 1, i));
    const descendo = i > indice;
    if (i === indice && !imediato) return;
    indice = i;
    const t = telas[i];
    if (t.classList.contains("rolavel")) t.scrollTop = descendo || imediato ? 0 : t.scrollHeight;
    t.querySelectorAll(".revelar").forEach((e) => e.classList.add("visto"));
    posicionar(imediato);
    travado = true;
    setTimeout(() => (travado = false), imediato ? 50 : 1050);
    atualizarUI();
    history.replaceState(null, "", i === 0 ? location.pathname + location.search : `#${t.id}`);
  }

  const proxima = () => {
    if (travado) return;
    ir(indice + 1);
  };
  const anterior = () => {
    if (travado) return;
    ir(indice - 1);
  };

  // A tela atual ainda tem conteúdo para rolar nessa direção? (só acontece no celular)
  const rolaPorDentro = (dir) => {
    const t = telas[indice];
    if (!t.classList.contains("rolavel")) return false;
    return dir > 0 ? t.scrollTop + t.clientHeight < t.scrollHeight - 2 : t.scrollTop > 2;
  };

  // Roda do mouse / trackpad: um gesto = uma tela (a inércia do trackpad é ignorada)
  addEventListener("wheel", (e) => {
    if (e.ctrlKey) return;
    const dir = Math.sign(e.deltaY);
    if (!dir) return;
    const agora = performance.now(), novoGesto = agora - ultimoEvento > 220;
    ultimoEvento = agora;
    if (rolaPorDentro(dir)) return;
    e.preventDefault();
    if (!novoGesto || Math.abs(e.deltaY) < 4) return;
    dir > 0 ? proxima() : anterior();
  }, { passive: false });

  // Toque (celular/tablet)
  let toqueY = null, toqueX = null, podia = { 1: true, "-1": true };
  addEventListener("touchstart", (e) => {
    toqueY = e.touches[0].clientY; toqueX = e.touches[0].clientX;
    podia = { 1: !rolaPorDentro(1), "-1": !rolaPorDentro(-1) };
  }, { passive: true });
  addEventListener("touchmove", (e) => {
    if (toqueY === null) return;
    const dy = toqueY - e.touches[0].clientY;
    const dir = Math.sign(dy);
    if (dir && podia[dir] && !e.target.closest("textarea, select")) e.preventDefault();
  }, { passive: false });
  addEventListener("touchend", (e) => {
    if (toqueY === null) return;
    const dy = toqueY - e.changedTouches[0].clientY, dx = toqueX - e.changedTouches[0].clientX;
    toqueY = null;
    if (Math.abs(dy) < 50 || Math.abs(dy) < Math.abs(dx)) return;
    const dir = Math.sign(dy);
    if (!podia[dir]) return;
    dir > 0 ? proxima() : anterior();
  }, { passive: true });

  // Teclado
  addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea, select")) return;
    if (["ArrowDown", "PageDown", " "].includes(e.key)) { if (!rolaPorDentro(1)) { e.preventDefault(); proxima(); } }
    else if (["ArrowUp", "PageUp"].includes(e.key)) { if (!rolaPorDentro(-1)) { e.preventDefault(); anterior(); } }
    else if (e.key === "Home") { e.preventDefault(); ir(0); }
    else if (e.key === "End") { e.preventDefault(); ir(telas.length - 1); }
  });

  // Links internos (menu, botões "fale com um especialista" etc.)
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const alvo = document.querySelector(a.getAttribute("href"));
    const tela = alvo && alvo.closest(".tela");
    if (!tela) return;
    e.preventDefault();
    ir(telas.indexOf(tela));
  });

  // Foco por teclado (Tab) num campo de outra tela leva até ela
  document.addEventListener("focusin", (e) => {
    const tela = e.target.closest && e.target.closest(".tela");
    if (tela && telas.indexOf(tela) !== indice) ir(telas.indexOf(tela), true);
  });
  // O navegador pode tentar rolar a página ao focar um campo; quem move as telas é o trilho
  addEventListener("scroll", () => { if (scrollY) scrollTo(0, 0); });

  /* ── Encaixe: o conteúdo de cada tela sempre cabe no monitor ─────────── */
  // No desktop o conteúdo é reduzido proporcionalmente até caber; no celular, se não couber,
  // a tela rola por dentro (texto pequeno demais seria ilegível).
  const encaixar = () => {
    const desktop = innerWidth > 860;
    telas.forEach((t) => {
      const c = t.querySelector(":scope > .conteudo");
      if (!c) return;
      c.style.zoom = "";
      t.classList.remove("rolavel");
      const cs = getComputedStyle(t);
      const disponivel = t.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const necessario = c.scrollHeight;
      let z = Math.min(1, (disponivel * 0.98) / necessario); // 2% de folga
      z = Math.max(z, desktop ? 0.5 : 0.86);
      if (z < 1) c.style.zoom = z.toFixed(3);
      if (c.getBoundingClientRect().height > disponivel + 2) t.classList.add("rolavel");
    });
  };

  const aoRedimensionar = () => { medirVh(); encaixar(); posicionar(true); };
  let espera;
  addEventListener("resize", () => { clearTimeout(espera); espera = setTimeout(aoRedimensionar, 120); });
  encaixar();
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(encaixar);
  addEventListener("load", encaixar);

  // Abre direto na tela do endereço (#contato etc.)
  const inicial = location.hash && document.querySelector(location.hash);
  if (inicial && inicial.closest(".tela")) {
    ir(telas.indexOf(inicial.closest(".tela")), true);
  } else {
    ir(0, true);
  }
  document.querySelectorAll("[data-ano]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ── WhatsApp ─────────────────────────────────────────────────────────── */
  if (S.whatsapp) {
    const num = String(S.whatsapp.numero || "").replace(/\D/g, "");
    const url = `https://wa.me/${num}?text=${encodeURIComponent(S.whatsapp.mensagem || "")}`;
    if (whats) whats.href = url;
    document.querySelectorAll("[data-whats]").forEach((a) => (a.href = url));
  }

  // Links dos serviços já escolhem o assunto do formulário
  const sel = document.querySelector("#f-assunto");
  document.querySelectorAll("[data-assunto]").forEach((a) =>
    a.addEventListener("click", () => { if (sel) sel.value = a.dataset.assunto; })
  );

  /* ── Formulário → e-mail ──────────────────────────────────────────────── */
  const form = document.querySelector(".form");
  if (form && S.contato) {
    const status = form.querySelector(".form-status");
    const botao = form.querySelector("button[type=submit]");
    const avisar = (txt, tipo) => { status.textContent = txt; status.className = `form-status campo--inteiro ${tipo || ""}`; };

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (form.elements._honey.value) return; // robô
      let valido = true;
      form.querySelectorAll("[required]").forEach((c) => {
        const ok = c.type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.value) : c.value.trim().length > 1;
        c.closest(".campo").classList.toggle("erro", !ok);
        if (!ok) valido = false;
      });
      if (!valido) return avisar("Confira os campos destacados.", "falha");

      const dados = Object.fromEntries(new FormData(form));
      delete dados._honey;
      const assunto = S.contato.assunto || `Novo contato pelo site ${S.nome || ""}`;
      let url, corpo;
      if (S.contato.web3formsChave) {
        url = "https://api.web3forms.com/submit";
        corpo = { access_key: S.contato.web3formsChave, subject: assunto, from_name: S.nome, ...dados };
      } else {
        url = `https://formsubmit.co/ajax/${encodeURIComponent(S.contato.email)}`;
        corpo = { _subject: assunto, _template: "table", _captcha: "false", ...dados };
      }

      botao.disabled = true;
      avisar("Enviando…");
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(corpo),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.success === false || j.success === "false") throw new Error(j.message || r.status);
        form.reset();
        avisar("Recebemos seu contato. Em breve falamos com você.", "ok");
      } catch (e) {
        console.warn("Falha no envio do formulário:", e);
        avisar("Não foi possível enviar agora. Chame a gente no WhatsApp.", "falha");
      } finally {
        botao.disabled = false;
      }
    });
  }
})();
