// curso.js
import { SupabaseService } from './supabase.js';
import { menus } from './main.js';

const supabaseService = new SupabaseService();

import { adicionarComentario, carregarComentarios, inicializarComentarios } from './comentarios.js';

// -------------------- HELPERS RUNTIME (mantém supabase.js intacto) --------------------
supabaseService.getCursoByCodigo = async function (codigo) {
    console.log('[getCursoByCodigo] codigo:', codigo);
    return this.supabase
        .from('curso')
        .select(`
            *,
            subarea:subarea_codigo (
                nome,
                area:area_codigo (nome)
            ),
            grau:grau_codigo (nome)
        `)
        .eq('codigo', codigo)
        .single();
};

supabaseService.getCampusByCurso = async function (cursoCodigo) {
    console.log('[getCampusByCurso] cursoCodigo:', cursoCodigo);
    const { data: links, error } = await this.supabase
        .from('campus_has_curso')
        .select('campus_codigo')
        .eq('curso_codigo', cursoCodigo);

    if (error) {
        console.error('[getCampusByCurso] erro links:', error);
        return { data: null, error };
    }

    const campusIds = (links || []).map(l => l.campus_codigo);
    if (!campusIds.length) return { data: [], error: null };

    return this.supabase
        .from('campus')
        .select(`
            *,
            municipio:municipio_codigo (nome),
            universidade:universidade_codigo (nome, sigla, logo)
        `)
        .in('codigo', campusIds);
};

// -------------------- RENDER CARDS --------------------
function criarCardCampus(campus) {
    return `
        <div class="cardcampus" data-id="${campus?.codigo}">
            <div id="topoCardCampus">
                <div id="iconeCardCampus"><i class="fa-solid fa-building"></i></div>
                <div id="nomeCampus">${campus?.nome || 'Nome do campus'}</div>
            </div>
            <div id="detalhesCardCampus">
                <div><i class="fa-solid fa-location-dot"></i> ${campus?.municipio?.nome || '-'}</div>
                <div id="botaoCardCampus">
                    <button class="learn-more">
                        <span class="circle" aria-hidden="true"><span class="icon arrow"></span></span>
                        <span class="button-text">Ver mais</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function criarCardCursoLista(curso) {
    // card usado em listagens / resultados (similar ao de universidade)
    const areaNome = curso?.subarea?.area?.nome || '';
    const subareaNome = curso?.subarea?.nome || '';
    const grauNome = curso?.grau?.nome || '';

    return `
        <div class="cardcurso-list" data-id="${curso?.codigo}">
            <div class="cardcurso-list-header">
                <div class="cardcurso-list-title">${curso?.nome_completo || curso?.nome || 'Curso sem nome'}</div>
                <div class="cardcurso-list-tags">
                    ${grauNome ? `<span class="tag tag-grau">${grauNome}</span>` : ''}
                </div>
            </div>
            <div class="cardcurso-list-body">
                ${areaNome ? `<div class="cardcurso-row"><b>Área:</b> <span class="area-value">${areaNome}</span></div>` : ''}
                ${subareaNome ? `<div class="cardcurso-row"><b>Subárea:</b> <span class="subarea-value">${subareaNome}</span></div>` : ''}
                <div class="cardcurso-actions">
                    <button class="button-detalhe" data-id="${curso?.codigo}">Ver Detalhes</button>
                </div>
            </div>
        </div>
    `;
}

// -------------------- PÁGINA DE DETALHE DO CURSO --------------------
async function renderCurso(codigo) {
    console.log('[renderCurso] inicio codigo:', codigo);
    const container = document.getElementById('card-detalhe');
    if (!container) {
        console.warn('[renderCurso] container #card-detalhe não encontrado no DOM');
        return;
    }

    container.innerHTML = '<p style="color:#092e5e;font-size:1.2em;">Carregando...</p>';

    try {
        const { data: curso, error: cursoError } = await supabaseService.getCursoByCodigo(codigo);
        if (cursoError) {
            console.error('[renderCurso] erro ao buscar curso:', cursoError);
            container.innerHTML = `<p style="color:#c0392b;">Erro ao carregar curso.</p>`;
            return;
        }

        if (!curso) {
            container.innerHTML = `<p style="color:#092e5e;">Curso não encontrado.</p>`;
            return;
        }

        // Header / cartão principal do curso (estilo similar ao de universidade)
        let html = `
            <div class="cardcurso-detalhe">
                <div class="cardcurso-detalhe-header">
                    <h1>${curso.nome_completo || curso.nome}</h1>
                    <div class="meta">
                        ${curso.subarea?.area?.nome ? `<span class="meta-item">${curso.subarea.area.nome}</span>` : ''}
                        ${curso.subarea?.nome ? `<span class="meta-item">${curso.subarea.nome}</span>` : ''}
                        ${curso.grau?.nome ? `<span class="meta-item">${curso.grau.nome}</span>` : ''}
                    </div>
                </div>
            </div>
        `;

        // Busca campi que oferecem o curso
        const { data: campi, error: campusError } = await supabaseService.getCampusByCurso(codigo);

        html += `<div id="divcampusTitulo"><h4 id="campustitulo">Campus onde o curso é oferecido</h4>
                    <p id="campusSubtitulo">Confira os locais disponíveis:</p></div>`;

        if (campusError) {
            console.error('[renderCurso] erro ao buscar campi:', campusError);
            html += `<p style="color:#c0392b;">Erro ao carregar campi.</p>`;
        } else if (!campi || campi.length === 0) {
            html += `<p style="color:#092e5e;">Nenhum campus encontrado para este curso.</p>`;
        } else {
            html += '<div id="campi-list">';
            campi.forEach(c => { html += criarCardCampus(c); });
            html += '</div>';
        }

        container.innerHTML = html;

    } catch (err) {
        console.error('[renderCurso] erro inesperado:', err);
        container.innerHTML = `<p style="color:#c0392b;">Erro inesperado.</p>`;
    }
}

// -------------------- BUSCA / LISTAGEM DE CURSOS (aceita 1 caractere) --------------------
async function carregarCursos(termo = '') {
    console.log('[carregarCursos] termo:', termo);
    try {
        let query = supabaseService.supabase
            .from('curso')
            .select('codigo, nome_completo, nome, subarea:subarea_codigo (nome, area:area_codigo (nome)), grau:grau_codigo (nome)');

        if (termo && termo.length >= 1) {
            const pattern = `%${termo}%`;
            // procura em nome e nome_completo
            // note: .or string format é `col1.ilike.%val%,col2.ilike.%val%`
            query = query.or(`nome.ilike.${pattern},nome_completo.ilike.${pattern}`);
        }

        // opcional: limite para não puxar milhares de linhas
        query = query.order('nome_completo', { ascending: true }).limit(200);

        const { data: cursos, error } = await query;

        if (error) {
            console.error('[carregarCursos] erro na query:', error);
            return;
        }

        // Popula select #selectCurso se existir
        const select = document.getElementById("selectCurso");
        if (select) {
            // salva primeira opção padrão (se existir)
            const placeholder = select.querySelector('option[value=""]')?.outerHTML || '<option value="">Selecione um curso</option>';
            select.innerHTML = placeholder;
            cursos.forEach(curso => {
                const option = document.createElement("option");
                option.value = curso.codigo;
                option.text = curso.nome_completo || curso.nome || "Curso sem nome";
                select.appendChild(option);
            });
        }

        // Render cards em #cards-container ou #cursos-resultados (compatibilidade)
        const resultsContainer = document.getElementById('cards-container') || document.getElementById('cursos-resultados');
        if (resultsContainer) {
            if (!cursos || cursos.length === 0) {
                resultsContainer.innerHTML = `<p style="color:#092e5e;font-size:1.1em;">Nenhum curso encontrado.</p>`;
            } else {
                let html = '';
                cursos.forEach(curso => {
                    html += criarCardCursoLista(curso);
                });
                resultsContainer.innerHTML = html;
            }
        }

        console.log('[carregarCursos] carregados cursos:', (cursos || []).length);

    } catch (err) {
        console.error('[carregarCursos] erro inesperado:', err);
    }
}

// -------------------- INTERAÇÕES --------------------
function acessarCursoSelecionado() {
    const select = document.getElementById("selectCurso");
    const codigo = select ? select.value : null;
    if (!codigo) {
        alert("Selecione um curso!");
        return;
    }
    window.location.href = `curso.html?codigo=${encodeURIComponent(codigo)}`;
}

// clique em botão-detalhe de card ou no próprio card
document.addEventListener("click", function (e) {
    // botão "Ver Detalhes" dentro do card de lista
    const btn = e.target.closest('.button-detalhe');
    if (btn) {
        const codigo = btn.getAttribute('data-id');
        if (codigo) {
            window.location.href = `curso.html?codigo=${encodeURIComponent(codigo)}`;
        }
        return;
    }

    // clique no cardcurso-list inteiro
    const cardCurso = e.target.closest('.cardcurso-list');
    if (cardCurso) {
        const codigo = cardCurso.getAttribute('data-id');
        if (codigo) {
            window.location.href = `curso.html?codigo=${encodeURIComponent(codigo)}`;
        }
        return;
    }

    // clique em card campus (quando estiver no detalhe)
    const cardCampus = e.target.closest('.cardcampus');
    if (cardCampus) {
        const campusId = cardCampus.getAttribute('data-id');
        if (campusId) {
            window.location.href = `campus.html?codigo=${encodeURIComponent(campusId)}`;
        }
        return;
    }
});

// -------------------- UTIL --------------------
function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

// -------------------- INITIALIZE --------------------
document.addEventListener("DOMContentLoaded", async function () {
    console.log('[curso.js] DOMContentLoaded');

    menus();

    // busca instantânea (aceita 1 caractere)
    const cursoBuscaInput = document.getElementById('cursoBusca');
    if (cursoBuscaInput) {
        cursoBuscaInput.addEventListener('input', function () {
            const termo = cursoBuscaInput.value.trim();
            // aceitar 1 caractere ou vazio
            if (termo.length >= 1 || termo.length === 0) {
                carregarCursos(termo);
            }
        });
    }

    // botão acessar curso
    const btnAcessar = document.getElementById("btnAcessarCurso");
    if (btnAcessar) {
        btnAcessar.addEventListener("click", acessarCursoSelecionado);
    }

    // carrega select / lista inicial
    await carregarCursos(''); // carrega tudo (até 200 por limite)

    // se veio ?codigo= na URL, renderiza detalhe do curso
    const codigoUrl = getQueryParam("codigo");
    if (codigoUrl) {
        renderCurso(codigoUrl);
    }
});
