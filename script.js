'use strict';

/* =====================================================
   BARBEARIA SANTANA - LÓGICA DO AGENDAMENTO
   ===================================================== */


/* =====================================================
   1) CONFIGURAÇÕES: É AQUI QUE VOCÊ EDITA O QUE MUDA COM FREQUÊNCIA
   ===================================================== */

/* NÚMERO DO WHATSAPP DA BARBEARIA
   - ddi: código do país (Brasil = 55). Não precisa mudar.
   - telefone: DDD + número, SOMENTE números, sem espaços, parênteses ou traços.
     Exemplo: (73) 98147-4362  ->  "73981474362"
   Para trocar o número, altere apenas a linha "telefone" abaixo. */
const CONFIG = {
  ddi: '55',
  telefone: '73981474362',
};

/* SERVIÇOS E PREÇOS
   - Para alterar um preço, mude o valor de "preco" (use ponto, não vírgula: 35 ou 35.5).
   - Para alterar um nome, mude o texto de "nome".
   - Para adicionar um serviço, copie uma linha e use um "id" novo e único.
   - "inclui" é opcional: usado só no combo, para o site avisar quanto o cliente economiza
     e se ele marcou serviços repetidos. A economia é calculada automaticamente. */
const SERVICOS = [
  { id: 'corte',       nome: 'Corte de Cabelo',        preco: 35 },
  { id: 'barba',       nome: 'Barba Completa',         preco: 25 },
  { id: 'sobrancelha', nome: 'Design de Sobrancelha',  preco: 15 },
  { id: 'combo',       nome: 'Combo: Corte + Barba',   preco: 50, inclui: ['corte', 'barba'] },
];

/* HORÁRIOS DE ATENDIMENTO
   Lista dos horários que aparecem para o cliente. Já está sem 12:00 e 13:00.
   Para liberar ou bloquear um horário, adicione ou remova da lista (formato "HH:MM"). */
const HORARIOS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

/* DIA EM QUE A BARBEARIA FECHA
   0 = domingo, 1 = segunda, 2 = terça ... 6 = sábado */
const DIA_FECHADO = 0;


/* =====================================================
   2) ELEMENTOS DA PÁGINA
   ===================================================== */
const el = {
  form: document.getElementById('form-agendamento'),
  lista: document.getElementById('lista-servicos'),
  avisoCombo: document.getElementById('aviso-combo'),
  nome: document.getElementById('nome'),
  data: document.getElementById('data'),
  horario: document.getElementById('horario'),
  resumoServicos: document.getElementById('resumo-servicos'),
  resumoData: document.getElementById('resumo-data'),
  resumoHorario: document.getElementById('resumo-horario'),
  total: document.getElementById('total'),
  erros: {
    servicos: document.getElementById('erro-servicos'),
    data: document.getElementById('erro-data'),
    horario: document.getElementById('erro-horario'),
    nome: document.getElementById('erro-nome'),
  },
};


/* =====================================================
   3) FUNÇÕES AUXILIARES
   ===================================================== */

/* 35 -> "35,00" */
function numero(valor) {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* 35 -> "R$ 35,00" */
function moeda(valor) {
  return 'R$ ' + numero(valor);
}

/* Data de hoje no formato do input date (AAAA-MM-DD), usando o fuso do aparelho */
function hojeISO() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/* "2026-10-17" -> objeto Date local (evita erro de fuso que acontece com new Date("2026-10-17")) */
function lerData(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

/* "2026-10-17" -> "17/10/2026" */
function formatarDataBR(iso) {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

/* Minutos desde meia-noite: "14:00" -> 840 */
function emMinutos(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function minutosAgora() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/* Devolve o texto do erro da data, ou "" se estiver tudo certo */
function validarData(iso) {
  if (!iso) return 'Escolha uma data.';

  const data = lerData(iso);
  if (Number.isNaN(data.getTime())) return 'Data inválida.';
  if (iso < hojeISO()) return 'Essa data já passou. Escolha hoje ou um dia futuro.';
  if (data.getDay() === DIA_FECHADO) return 'Não abrimos aos domingos. Escolha outro dia.';
  return '';
}

/* Horário já passou? (só vale quando a data escolhida é hoje) */
function horarioPassou(iso, hhmm) {
  return iso === hojeISO() && emMinutos(hhmm) <= minutosAgora();
}

function servicosSelecionados() {
  const marcados = [...el.lista.querySelectorAll('input:checked')].map((i) => i.value);
  return SERVICOS.filter((s) => marcados.includes(s.id));
}

function mostrarErro(campo, texto) {
  el.erros[campo].textContent = texto;
  const entrada = campo === 'servicos' ? null : el[campo];
  if (entrada) entrada.setAttribute('aria-invalid', texto ? 'true' : 'false');
}


/* =====================================================
   4) SERVIÇOS: cria os cards a partir da lista SERVICOS
   ===================================================== */
function economiaDoCombo(servico) {
  const soma = servico.inclui
    .map((id) => SERVICOS.find((s) => s.id === id))
    .reduce((acc, s) => acc + (s ? s.preco : 0), 0);
  return soma - servico.preco;
}

function renderizarServicos() {
  el.lista.innerHTML = SERVICOS.map((s) => {
    const economia = s.inclui ? economiaDoCombo(s) : 0;
    const dica = economia > 0 ? `<span class="servico__dica">Economize ${moeda(economia)}</span>` : '';

    return `
      <label class="servico">
        <input type="checkbox" name="servico" value="${s.id}">
        <span class="servico__corpo">
          <span class="servico__marca" aria-hidden="true"></span>
          <span class="servico__nome">${s.nome}</span>
          ${dica}
          <span class="servico__preco">${moeda(s.preco)}</span>
        </span>
      </label>`;
  }).join('');
}

/* Avisa (sem bloquear) quando o cliente marca o combo junto com serviços que ele já inclui */
function verificarRepeticao(selecionados) {
  const ids = selecionados.map((s) => s.id);
  const repetido = selecionados.some(
    (s) => s.inclui && s.inclui.some((incluido) => ids.includes(incluido))
  );
  el.avisoCombo.hidden = !repetido;
}


/* =====================================================
   5) HORÁRIOS: preenche o seletor conforme a data escolhida
   ===================================================== */
function popularHorarios() {
  const dataIso = el.data.value;
  const anterior = el.horario.value;

  if (!dataIso || validarData(dataIso)) {
    el.horario.innerHTML = '<option value="">Escolha a data primeiro</option>';
    el.horario.disabled = true;
    return;
  }

  const livres = HORARIOS.filter((h) => !horarioPassou(dataIso, h));

  if (livres.length === 0) {
    el.horario.innerHTML = '<option value="">Sem horários hoje. Escolha outro dia.</option>';
    el.horario.disabled = true;
    return;
  }

  el.horario.disabled = false;
  el.horario.innerHTML =
    '<option value="">Selecione um horário</option>' +
    livres.map((h) => `<option value="${h}">${h}</option>`).join('');

  /* Mantém o horário que o cliente já tinha escolhido, se ele ainda estiver disponível */
  if (livres.includes(anterior)) el.horario.value = anterior;
}


/* =====================================================
   6) RESUMO E VALOR TOTAL (atualiza em tempo real)
   ===================================================== */
function atualizarResumo() {
  const selecionados = servicosSelecionados();
  const total = selecionados.reduce((soma, s) => soma + s.preco, 0);

  el.resumoServicos.textContent = selecionados.length
    ? selecionados.map((s) => s.nome).join(', ')
    : 'Nenhum selecionado';

  el.resumoData.textContent = el.data.value && !validarData(el.data.value)
    ? formatarDataBR(el.data.value)
    : '—';

  el.resumoHorario.textContent = el.horario.value || '—';
  el.total.textContent = moeda(total);

  verificarRepeticao(selecionados);
}


/* =====================================================
   7) VALIDAÇÃO DO FORMULÁRIO
   ===================================================== */
function validarFormulario() {
  const problemas = []; /* guarda os campos com erro, na ordem em que aparecem na tela */

  if (servicosSelecionados().length === 0) {
    mostrarErro('servicos', 'Marque pelo menos um serviço.');
    problemas.push(el.lista.querySelector('input'));
  } else {
    mostrarErro('servicos', '');
  }

  const erroData = validarData(el.data.value);
  mostrarErro('data', erroData);
  if (erroData) problemas.push(el.data);

  let erroHorario = '';
  if (!el.data.value || erroData) {
    erroHorario = 'Escolha uma data válida para ver os horários.';
  } else if (!el.horario.value) {
    erroHorario = 'Escolha um horário.';
  } else if (horarioPassou(el.data.value, el.horario.value)) {
    erroHorario = 'Esse horário já passou. Escolha outro.';
    popularHorarios();
  }
  mostrarErro('horario', erroHorario);
  if (erroHorario) problemas.push(el.horario);

  /* Nome completo: remove espaços extras e exige pelo menos nome e sobrenome */
  const nome = el.nome.value.trim().replace(/\s+/g, ' ');
  const erroNome = nome.split(' ').length < 2 || nome.length < 5
    ? 'Digite seu nome completo (nome e sobrenome).'
    : '';
  mostrarErro('nome', erroNome);
  if (erroNome) problemas.push(el.nome);

  /* Leva o cliente ao primeiro campo com problema */
  if (problemas.length) {
    problemas[0].focus();
    return false;
  }
  return true;
}


/* =====================================================
   8) WHATSAPP: monta a mensagem e abre a conversa
   ===================================================== */
function montarMensagem() {
  const selecionados = servicosSelecionados();
  const total = selecionados.reduce((soma, s) => soma + s.preco, 0);
  const nome = el.nome.value.trim().replace(/\s+/g, ' ');

  /* Este é o modelo da mensagem. Cada item do array vira uma linha no WhatsApp. */
  return [
    'Olá! Gostaria de agendar um horário.',
    `Nome: ${nome}`,
    `Serviço(s): ${selecionados.map((s) => s.nome).join(', ')}`,
    `Data: ${formatarDataBR(el.data.value)}`,
    `Horário: ${el.horario.value}`,
    `Valor Total: R$ ${numero(total)}`,
  ].join('\n');
}

function enviarParaWhatsApp() {
  const texto = encodeURIComponent(montarMensagem());
  const url = `https://wa.me/${CONFIG.ddi}${CONFIG.telefone}?text=${texto}`;

  /* Abre em uma nova aba */
  window.open(url, '_blank', 'noopener');
}


/* =====================================================
   9) EVENTOS E INICIALIZAÇÃO
   ===================================================== */
function iniciar() {
  renderizarServicos();

  /* Bloqueia datas passadas direto no calendário do celular/navegador */
  el.data.min = hojeISO();

  el.lista.addEventListener('change', () => {
    mostrarErro('servicos', '');
    atualizarResumo();
  });

  el.data.addEventListener('input', () => {
    /* Mostra o erro na hora se for domingo ou data passada */
    mostrarErro('data', el.data.value ? validarData(el.data.value) : '');
    mostrarErro('horario', '');
    popularHorarios();
    atualizarResumo();
  });

  el.horario.addEventListener('change', () => {
    mostrarErro('horario', '');
    atualizarResumo();
  });

  el.nome.addEventListener('input', () => mostrarErro('nome', ''));

  el.form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    if (validarFormulario()) enviarParaWhatsApp();
  });

  atualizarResumo();
}

iniciar();
