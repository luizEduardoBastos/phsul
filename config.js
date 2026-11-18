window.SITE = {
  nome: "PHSUL",

  whatsapp: {
    numero: "555121083030", // só dígitos: DDI + DDD + número
    mensagem: "Olá! Venho através do site, gostaria de mais informações sobre os seus produtos e serviços.",
  },

  contato: {
    email: "phsul@phsul.com.br",
    // Opcional: chave do Web3Forms (https://web3forms.com). Se vazio, usa FormSubmit.
    web3formsChave: "",
    assunto: "Novo contato pelo site PHSUL",
  },

  frames: {
    total: 160,
    desktop: "assets/frames/desktop/f_{n}.webp",
    mobile: "assets/frames/mobile/f_{n}.webp",
  },

  // Momentos (em segundos do vídeo original; com velocidade maior acontecem antes) em que as mensagens aparecem
  abertura: {
    velocidade: 2.1, // 1 = velocidade original do vídeo
    clique1: 2.4, // 1º clique do conector → "Plantão técnico"
    clique2: 7.0, // luz azul já totalmente acesa (começa a acender em 6,48s e estabiliza em 7,0s) → "Fale com um especialista"
  },
};
