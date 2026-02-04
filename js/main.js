// main.js (versão atualizada: busca de cursos com 1 caractere e cards de curso iguais aos de universidade)
import { SupabaseService } from './supabase.js';

// header dropdown / avatar behavior is initialized from header.js

const supabaseService = new SupabaseService();

const advancedSearchForm = document.getElementById('advanced-search-form');
const buscaInput = document.getElementById('busca');
let filtrosAtivos = ['universidade']; // Filtro padrão ao carregar (mantive array pra compatibilidade)

// Estado para manter os filtros aplicados (acumulativos)
let filtrosAplicados = {
    universidade: {},
    curso: {}
};

/* Pagination state for cards: show 18 at a time and allow "load more" */
const CARDS_PER_PAGE = 18; // number of cards to show per click
let currentCardLimit = CARDS_PER_PAGE; // current visible count
let lastResultadosCache = []; // caches last fetched resultados to support Load More without refetch
let lastSearchTerm = '';
let lastFiltros = {};

// elementos UI
const advancedBtn = document.getElementById("advanced-search-btn");
const advancedDropdown = document.getElementById("advanced-search-dropdown");
const buscaBtn = document.getElementById('lupa');

const btnUni = document.getElementById('botao_universidade');
const btnCurso = document.getElementById('botao_curso');
const btnArea = document.getElementById('botao_area');

// seções de filtros avançados
const sectionUni = document.getElementById('advanced-filters-universidade');
const sectionCurso = document.getElementById('advanced-filters-curso');
const sectionArea = document.getElementById('advanced-filters-area');

// Função para carregar as opções de filtros
async function carregarOpcoesFiltros() {
    try {
        // Carregar cidades
        const { data: cidades } = await supabaseService.getCidades();
        const cidadeSelect = document.getElementById('uni_cidade');
        if (cidadeSelect && cidades) {
            cidades.forEach(cidade => {
                const option = document.createElement('option');
                option.value = cidade.codigo;
                option.textContent = cidade.nome;
                cidadeSelect.appendChild(option);
            });
        }

        // Carregar estados
        const { data: estados } = await supabaseService.getEstados();
        const estadoSelect = document.getElementById('uni_estado');
        if (estadoSelect && estados) {
            estados.forEach(estado => {
                const option = document.createElement('option');
                option.value = estado.codigo;
                option.textContent = estado.sigla;
                estadoSelect.appendChild(option);
            });
        }

        // Carregar categorias administrativas
        const categorias = await supabaseService.getCategoriasAdministrativas();
        const categoriaSelect = document.getElementById('uni_categoria');
        if (categoriaSelect && categorias) {
            categorias.forEach(categoria => {
                const option = document.createElement('option');
                option.value = categoria;
                option.textContent = categoria;
                categoriaSelect.appendChild(option);
            });
        }

        // Carregar organizações acadêmicas
        const { data: organizacoes } = await supabaseService.getOrganizacoesAcademicas();
        const organizacaoSelect = document.getElementById('uni_organizacao');
        if (organizacaoSelect && organizacoes) {
            organizacoes.forEach(org => {
                const option = document.createElement('option');
                option.value = org.codigo;
                option.textContent = org.descricao;
                organizacaoSelect.appendChild(option);
            });
        }

        // Carregar áreas (para filtro de cursos)
        const { data: areas } = await supabaseService.getAreas();
        const areaSelect = document.getElementById('curso_area');
        if (areaSelect && areas) {
            areas.forEach(area => {
                const option = document.createElement('option');
                option.value = area.codigo;
                option.textContent = area.nome;
                areaSelect.appendChild(option);
            });
        }

        // Carregar graus (para filtro de cursos)
        const { data: graus } = await supabaseService.getGraus();
        const grauSelect = document.getElementById('curso_grau');
        if (grauSelect && graus) {
            graus.forEach(grau => {
                const option = document.createElement('option');
                option.value = grau.codigo;
                option.textContent = grau.nome;
                grauSelect.appendChild(option);
            });
        }
    } catch (err) {
        console.error('Erro ao carregar opções de filtros:', err);
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    initializeAvatarDropdown();
    menus();

    // definir botões
    if (btnUni) btnUni.addEventListener('click', () => setActiveSearchType('universidade'));
    if (btnCurso) btnCurso.addEventListener('click', () => setActiveSearchType('curso'));
    if (btnArea) btnArea.addEventListener('click', () => setActiveSearchType('area'));

    // gerencia input de busca
    if (buscaInput) {
        buscaInput.addEventListener('input', function () {
            const termo = buscaInput.value.trim();
            // ALTERAÇÃO: aceita 1 caractere ou vazio (antes era >1)
            if (termo.length >= 1 || termo.length === 0) {
                buscarECriarCards(termo);
            } else {
                document.getElementById('cards-container').innerHTML = '';
            }
        });
    }

    if (buscaBtn) {
        buscaBtn.addEventListener('click', function () {
            const termo = buscaInput.value.trim();
            buscarECriarCards(termo);
        });
    }

    // advanced dropdown toggle
    if (advancedBtn) {
        advancedBtn.addEventListener('click', function () {
            if (advancedDropdown.classList.contains("hidden")) {
                showAdvancedDropdown();
            } else {
                hideAdvancedDropdown();
            }
        });
    }

    // advanced form submit (aplicar filtros avançados)
    if (advancedSearchForm) {
        advancedSearchForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const tipo = filtrosAtivos[0];
            const termo = buscaInput.value.trim();

            // Captura os filtros do formulário
            const filtrosFormulario = {};
            if (tipo === 'universidade') {
                const cidade = advancedSearchForm.querySelector('[name="uni_cidade"]')?.value || '';
                const estado = advancedSearchForm.querySelector('[name="uni_estado"]')?.value || '';
                const categoria = advancedSearchForm.querySelector('[name="uni_categoria"]')?.value || '';
                const organizacao = advancedSearchForm.querySelector('[name="uni_organizacao"]')?.value || '';
                const nota = advancedSearchForm.querySelector('[name="uni_nota"]')?.value || '';

                if (cidade) filtrosFormulario.municipio_codigo = cidade;
                if (estado) filtrosFormulario.uf_codigo = estado;
                if (categoria) filtrosFormulario.categoria_administrativa = categoria;
                if (organizacao) filtrosFormulario.organizacao_academica_codigo = organizacao;
                if (nota) filtrosFormulario.igc_minimo = nota;
            } else if (tipo === 'curso') {
                const area = advancedSearchForm.querySelector('[name="curso_area"]')?.value || '';
                const subarea = advancedSearchForm.querySelector('[name="curso_subarea"]')?.value || '';
                const grau = advancedSearchForm.querySelector('[name="curso_grau"]')?.value || '';

                if (area) filtrosFormulario.area_codigo = area;
                if (subarea) filtrosFormulario.subarea_codigo = subarea;
                if (grau) filtrosFormulario.grau_codigo = grau;
            }

            // ACUMULAR filtros: mesclar com os filtros já aplicados
            filtrosAplicados[tipo] = {
                ...filtrosAplicados[tipo],
                ...filtrosFormulario
            };

            hideAdvancedDropdown();
            buscarECriarCards(termo, filtrosAplicados[tipo]); // passa os filtros acumulados
        });


        // limpar filtros (botão "Limpar")
        const btnClear = document.getElementById('advanced-clear');
        if (btnClear) {
            btnClear.addEventListener('click', function () {
                const tipo = filtrosAtivos[0];
                advancedSearchForm.reset();
                
                // Limpar estado acumulado de filtros
                filtrosAplicados[tipo] = {};
                
                hideAdvancedDropdown();
                buscarECriarCards(buscaInput.value.trim()); // busca novamente sem filtros
            });
        }
    }

    // Carregar opções de filtros
    await carregarOpcoesFiltros();

    // Listeners para carregar subáreas quando área muda
    const cursoAreaSelect = document.getElementById('curso_area');
    if (cursoAreaSelect) {
        cursoAreaSelect.addEventListener('change', async function () {
            const areaCodigo = this.value;
            const subareaSelect = document.getElementById('curso_subarea');
            if (subareaSelect) {
                if (areaCodigo) {
                    const { data: subareas } = await supabaseService.getSubareasByArea(areaCodigo);
                    subareaSelect.innerHTML = '<option value="">Todas as subáreas</option>';
                    if (subareas) {
                        subareas.forEach(sub => {
                            const option = document.createElement('option');
                            option.value = sub.codigo;
                            option.textContent = sub.nome;
                            subareaSelect.appendChild(option);
                        });
                    }
                } else {
                    subareaSelect.innerHTML = '<option value="">Todas as subáreas</option>';
                }
            }
        });
    }

    // estado inicial
    const params = new URLSearchParams(window.location.search);
    const queryParam = params.get('query');

    setActiveSearchType('universidade'); // destaca o botão e define filtrosAtivos

    if (queryParam && buscaInput) {
        buscaInput.value = queryParam;
        buscarECriarCards(queryParam); // busca com o termo da URL
    } else {
        buscarECriarCards(''); // busca inicial vazia para mostrar resultados padrão
    }
});

export function menus() {
    const menuIcon = document.getElementById("menu-icon");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");

    if (menuIcon && sidebar && overlay) {
        menuIcon.addEventListener("click", function () {
            sidebar.classList.toggle("active");
            overlay.classList.toggle("active");
        });

        overlay.addEventListener("click", function () {
            sidebar.classList.remove("active");
            overlay.classList.remove("active");
        });
    }
}

// Nova função: define qual tipo de busca está ativo e atualiza UI
function setActiveSearchType(type) {
    filtrosAtivos = [type]; // atualiza para o tipo selecionado
    
    // Resetar filtros ao mudar de tipo de busca
    if (advancedSearchForm) {
        advancedSearchForm.reset();
    }
    filtrosAplicados = { universidade: {}, curso: {} };

    // atualiza classes visuais dos botões
    [btnUni, btnCurso, btnArea].forEach(btn => {
        if (btn) btn.classList.remove('filtro-ativo')
    });

    if (type === 'universidade' && btnUni) btnUni.classList.add('filtro-ativo');
    if (type === 'curso' && btnCurso) btnCurso.classList.add('filtro-ativo');
    if (type === 'area' && btnArea) btnArea.classList.add('filtro-ativo');

    // atualiza seção de filtros avançados visível
    if (sectionUni) sectionUni.classList.toggle('hidden', type !== 'universidade');
    if (sectionCurso) sectionCurso.classList.toggle('hidden', type !== 'curso');
    if (sectionArea) sectionArea.classList.toggle('hidden', type !== 'area');

    // habilitar/desabilitar botão de filtros conforme tipo
    if (advancedBtn) {
        if (type === 'area') {
            advancedBtn.disabled = true;
            advancedBtn.classList.add('disabled');
            // remover active quando for área (não há filtros)
            advancedBtn.classList.remove('active');
            advancedBtn.setAttribute('aria-pressed', 'false');
            hideAdvancedDropdown();
        } else {
            advancedBtn.disabled = false;
            advancedBtn.classList.remove('disabled');
        }
    }

    // atualiza placeholder (opcional)
    if (buscaInput) {
        if (type === 'universidade') buscaInput.placeholder = 'Buscar universidades...';
        else if (type === 'curso') buscaInput.placeholder = 'Buscar cursos...';
        else if (type === 'area') buscaInput.placeholder = 'Buscar áreas...';
    }

    // força nova busca com o tipo selecionado
    const termoParaBusca = buscaInput ? buscaInput.value.trim() : '';
    buscarECriarCards(termoParaBusca);
}

function showAdvancedDropdown() {
    advancedDropdown.classList.remove('hidden');
    advancedDropdown.setAttribute('aria-hidden', 'false');

    if (advancedBtn) {
        advancedBtn.classList.add('active');
        advancedBtn.setAttribute('aria-pressed', 'true');
    }
}

function hideAdvancedDropdown() {
    advancedDropdown.classList.add('hidden');
    advancedDropdown.setAttribute('aria-hidden', 'true');

    if (advancedBtn) {
        advancedBtn.classList.remove('active');
        advancedBtn.setAttribute('aria-pressed', 'false');
    }
}


function inclinacao(area) {
    const exatasPercent = area.porcentagem_EH * 100;
    const humanasPercent = (1 - area.porcentagem_EH) * 100;

    return `
        <div class="barra-progresso">
            <div class="exatas" style="width: ${exatasPercent}%"></div>
            <div class="humanas" style="width: ${humanasPercent}%"></div>
        </div>
    
        <!-- Legenda -->
            <div class="flex justify-between text-xs text-gray-600">
                <span>Exatas: ${exatasPercent.toFixed(1)}%</span>
                <span>Humanas: ${humanasPercent.toFixed(1)}%</span>
            </div>
        `;
}

function regularString(str) {
    // Trata string vazia
    if (!str || str.trim() === '') return '';

    // Divide a string em palavras
    const words = str.split(' ');
    const formattedWords = words.map(word => {
        // Capitaliza a primeira letra e mantém o restante minúsculo
        if (word.length > 0) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }
        return word;
    });

    // Junta as palavras novamente
    return formattedWords.join(' ');
}


function criarCardArea(area) {
    return `
          <div id="cardArea">
  
              <div id="topoCardArea">
                  <div id="logoArea"> </div>
                  <div id="nomeArea">  ${regularString(area?.nome)} </div>
              </div>
      
              <div id="corpoCardArea">
  
                  <div id="divBarra"> ${inclinacao(area)} </div>
                  <div id="divBtn"> <button class="btnVerMaisArea" data-id="${area?.codigo}"> Ver Mais </button> </div>
              </div>
          </div>
          `;
}

document.addEventListener("click", function (e) {
    if (e.target.closest("#btnVerMaisArea")) {
        const card = e.target.closest("#btnVerMaisArea");
        const areaId = card.getAttribute("data-id");
        // Redirect to the university details page with the codigo as query parameter
        if (areaId) {
            window.location.href = `area.html?codigo=${encodeURIComponent(areaId)}`;
        }
    }
    const btn = e.target.closest(".btnVerMaisArea");
    if (!btn) return;
    const areaId = btn.getAttribute("data-id") || btn.dataset.id;
    if (areaId) {
        window.location.href = `area.html?codigo=${encodeURIComponent(areaId)}`;
    }
});

// Funções auxiliares para geolocalização e cálculo de distância
function getUserLocation(options = {}) {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation API não suportada no navegador.'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                resolve({ latitude, longitude });
            },
            error => {
                let errorMessage = 'Erro desconhecido ao acessar localização.';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Permissão negada para acessar a localização.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Localização indisponível.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Tempo de requisição de localização esgotado.';
                        break;
                }
                reject(new Error(errorMessage));
            },
            options
        );
    });
}

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371.0088; // raio da Terra em km
    const toRad = v => (v * Math.PI) / 180;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2)
        + Math.cos(φ1) * Math.cos(φ2)
        * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // distância em km
}

function formatDistance(dKm) {
    if (dKm >= 1) return `${dKm.toFixed(2)} km`;
    return `${(dKm * 1000).toFixed(0)} m`;
}

// Função para calcular a distância para o campus mais próximo
function calcularDistanciaParaCampus(userLocation, uni) {
    if (!userLocation) return null;

    // Verifica se há campi disponíveis (assume que uni.campi é uma lista de objetos com latitude e longitude)
    if (uni.campi && Array.isArray(uni.campi) && uni.campi.length > 0) {
        let menorDistancia = Infinity;
        uni.campi.forEach(campus => {
            if (campus.latitude && campus.longitude) {
                const distancia = haversineDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    campus.latitude,
                    campus.longitude
                );
                if (distancia < menorDistancia) {
                    menorDistancia = distancia;
                }
            }
        });
        return menorDistancia !== Infinity ? menorDistancia : null;
    }

    // Fallback: usa o município (reitoria) se não houver campi
    if (uni.municipio?.latitude && uni.municipio?.longitude) {
        return haversineDistance(
            userLocation.latitude,
            userLocation.longitude,
            uni.municipio.latitude,
            uni.municipio.longitude
        );
    }

    return null; // Sem dados de localização
}
// Funções para criar cards (mantidas as mesmas)
export function criarCardUniversidade(uni) {
    const distanciaHTML = (typeof uni?.distancia !== 'undefined')
        ? `<div class="cardUniversidade-row"><span class="cardUniversidade-label"><i class="fa fa-route"></i> Distância: ${formatDistance(uni.distancia)}</span></div>`
        : '';
    return ` <div class="cardUniversidade" >
                <div class="cardUniversidade-header">
                <img src="${uni?.logo}"
                    id="logo">
                <div id="nomes">
                    <div id="sigla">${uni?.sigla || ''}</div>
                    <div id="nome">${uni?.nome || ''}</div>
                </div>
                <div class="cardUniversidade-rating">
                    <span class="rating-value">${uni?.igc || '-'}</span>    
                    <i class="fa-solid fa-star"></i>
                </div>
            </div>
            <div class="cardUniversidade-body">
                <div class="cardUniversidade-row">
                    <span class="cardUniversidade-label">
                        <i class="fa fa-location-dot"></i> ${uni?.municipio?.nome || '-'}, ${uni?.municipio?.uf?.sigla || '-'}
                    </span>
                </div>
                <div class="cardUniversidade-row">
                    <span class="cardUniversidade-label">
                        <i class="fa fa-users"></i> ${uni?.organizacao.descricao || '-'}
                    </span>
                </div>
                ${distanciaHTML}
                <div id="bottomCard">
                    <div class="cardUniversidade-tags">
                        <span class="tag tag-grau">${uni?.categoria_administrativa || '-'}</span>
                    </div>
                    <button class="button">
                        <span class="button-content" data-id="${uni?.codigo}">Ver Detalhes</span>
                    </button>
                </div>
            </div>
        </div> `;
}

// Cria um card de busca para campus (mostra info da universidade + nome do campus)
function criarCardCampusBusca(campus) {
    const uni = campus.universidade || {};
    const distanciaHTML = (typeof campus?.distancia !== 'undefined')
        ? `<div class="cardUniversidade-row"><span class="cardUniversidade-label"><i class="fa fa-route"></i> Distância: ${formatDistance(campus.distancia)}</span></div>`
        : '';

    return ` <div class="cardUniversidade" >
                <div class="cardUniversidade-header">
                <img src="${uni?.logo}"
                    id="logo">
                <div id="nomes">
                    <div id="sigla">${uni?.sigla || ''}</div>
                    <div id="nome">${uni?.nome || ''}</div>
                </div>
                <div class="cardUniversidade-rating">
                    <span class="rating-value">${uni?.igc || '-'}</span>    
                    <i class="fa-solid fa-star"></i>
                </div>
            </div>
            <div class="cardUniversidade-body">
                <div class="cardUniversidade-row">
                    <span class="cardUniversidade-label">
                        <i class="fa fa-building"></i> Campus: ${campus?.nome || '-'}
                    </span>
                </div>
                <div class="cardUniversidade-row">
                    <span class="cardUniversidade-label">
                        <i class="fa fa-location-dot"></i> ${campus?.municipio?.nome || '-'}, ${campus?.municipio?.uf?.sigla || '-'}
                    </span>
                </div>
                <div class="cardUniversidade-row">
                    <span class="cardUniversidade-label">
                        <i class="fa fa-users"></i> ${uni?.organizacao?.descricao || uni?.organizacao || '-'}
                    </span>
                </div>
                ${distanciaHTML}
                <div id="bottomCard">
                    <div class="cardUniversidade-tags">
                        <span class="tag tag-grau">${uni?.categoria_administrativa || '-'}</span>
                    </div>
                    <a class="button" href="universidade.html?codigo=${encodeURIComponent(uni?.codigo || '')}&campus=${encodeURIComponent(campus?.codigo || '')}">
                        <span class="button-content">Ver Detalhes</span>
                    </a>
                </div>
            </div>
        </div> `;
}

// NOVA função: criar card de curso no mesmo estilo dos outros cards
function criarCardCurso(curso) {
    const areaNome = curso?.subarea?.area?.nome || '';
    const subareaNome = curso?.subarea?.nome || '';
    const grauNome = curso?.grau?.nome || '';

    return `
        <div class="cardCurso" >
            <div class="cardCurso-header">
                <div class="cardCurso-titulo">${curso?.nome_completo || curso?.nome || ''}</div>
                <div class="cardCurso-tags">
                    ${grauNome ? `<span class="tag tag-grau">${grauNome}</span>` : ''}
                </div>
            </div>
            <div class="cardCurso-body">
                <div class="cardCurso-row">
                    <span class="cardCurso-label"><b>Área:</b> ${areaNome || '-'}</span>
                </div>
                <div class="cardCurso-row">
                    <span class="cardCurso-label"><b>Subárea:</b> ${subareaNome || '-'}</span>
                </div>
                <div id="bottomCardCurso">
                    <button class="button">
                        <span class="button-content" data-id="${curso?.codigo}">Ver Detalhes</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}



// Função para exibir os filtros ativos de forma visual
function exibirFiltrosAtivos(filtros) {
    const displayDiv = document.getElementById('filtros-ativos-display');
    if (!displayDiv) return;

    if (!filtros || Object.keys(filtros).length === 0) {
        displayDiv.innerHTML = '';
        return;
    }

    // Mapa de rótulos dos filtros
    const rotulosFiltros = {
        municipio_codigo: 'Cidade',
        uf_codigo: 'Estado',
        categoria_administrativa: 'Categoria',
        organizacao_academica_codigo: 'Organização',
        igc_minimo: 'Nota mín. IGC',
        area_codigo: 'Área',
        subarea_codigo: 'Subárea',
        grau_codigo: 'Grau'
    };

    let html = '<div style="display: flex; flex-wrap: wrap; gap: 8px; margin: 15px 0; padding: 10px; background-color: #f5f5f5; border-radius: 5px;">';
    html += '<span style="font-weight: bold; color: #092e5e;">Filtros ativos:</span>';

    for (const [chave, valor] of Object.entries(filtros)) {
        if (valor) {
            const rotulo = rotulosFiltros[chave] || chave;
            // tentar obter um texto amigável (ex.: sigla do estado, nome da cidade) a partir dos selects
            let valorExibir = valor;
            try {
                if (chave === 'municipio_codigo') {
                    const sel = document.getElementById('uni_cidade');
                    const opt = sel?.querySelector(`option[value="${valor}"]`);
                    if (opt) valorExibir = opt.textContent;
                } else if (chave === 'uf_codigo') {
                    const sel = document.getElementById('uni_estado');
                    const opt = sel?.querySelector(`option[value="${valor}"]`);
                    if (opt) valorExibir = opt.textContent;
                } else if (chave === 'organizacao_academica_codigo') {
                    const sel = document.getElementById('uni_organizacao');
                    const opt = sel?.querySelector(`option[value="${valor}"]`);
                    if (opt) valorExibir = opt.textContent;
                } else if (chave === 'area_codigo') {
                    const sel = document.getElementById('curso_area');
                    const opt = sel?.querySelector(`option[value="${valor}"]`);
                    if (opt) valorExibir = opt.textContent;
                } else if (chave === 'subarea_codigo') {
                    const sel = document.getElementById('curso_subarea');
                    const opt = sel?.querySelector(`option[value="${valor}"]`);
                    if (opt) valorExibir = opt.textContent;
                } else if (chave === 'grau_codigo') {
                    const sel = document.getElementById('curso_grau');
                    const opt = sel?.querySelector(`option[value="${valor}"]`);
                    if (opt) valorExibir = opt.textContent;
                }
            } catch (e) { /* ignore DOM issues */ }

            html += `
                <span style="
                    display: inline-block;
                    background-color: #092e5e;
                    color: white;
                    padding: 5px 10px;
                    border-radius: 20px;
                    font-size: 0.9em;
                    cursor: pointer;"
                    data-filtro="${chave}">
                    ${rotulo}: <strong>${valorExibir}</strong> ✕
                </span>
            `;
        }
    }

    html += '</div>';
    displayDiv.innerHTML = html;

    // Adicionar listeners para remover filtros individuais
    displayDiv.querySelectorAll('span[data-filtro]').forEach(span => {
        span.addEventListener('click', function () {
            const chave = this.getAttribute('data-filtro');
            const tipo = filtrosAtivos[0];

            // Remover o filtro
            delete filtrosAplicados[tipo][chave];

            // Re-buscar com os filtros restantes
            buscarECriarCards(buscaInput.value.trim(), filtrosAplicados[tipo]);
        });
    });
}

// Função assíncrona de busca e criação dos cards conforme filtrosAtivos
async function buscarECriarCards(termo, filtrosForm = {}) {
    const cardsContainer = document.getElementById('cards-container');
    if (!cardsContainer) return;
    cardsContainer.innerHTML = '<p style="color:#092e5e;font-size:1.2em;">Buscando...</p>';

    // Exibir filtros ativos
    exibirFiltrosAtivos(filtrosForm);

    let html = '';
    let resultados = [];

    // busca por universidades
    if (filtrosAtivos.includes('universidade')) {
        try {
            // Tenta obter a localização do usuário
            const userLocation = await getUserLocation({ enableHighAccuracy: true, timeout: 10000 }).catch(() => null);

            // Usa a query com filtros se houver, caso contrário usa a query sem filtros
            let query;
            if (Object.keys(filtrosForm).length > 0) {
                query = supabaseService.getUniversidadesQueryWithFilters(termo, filtrosForm);
            } else {
                query = supabaseService.getUniversidadesQuery(termo);
            }

            const { data: universidades, error } = await query;

            if (error) {
                console.error('Erro ao buscar universidades:', error.message);
            } else if (universidades && universidades.length > 0) {
                // Se houver filtro de estado (uf), aplicar no cliente usando o objeto municipio.uf.codigo
                let universidadesFiltradas = universidades;
                if (filtrosForm && filtrosForm.uf_codigo) {
                    universidadesFiltradas = (universidades || []).filter(u => {
                        return String(u?.municipio?.uf?.codigo) === String(filtrosForm.uf_codigo);
                    });
                }

                // Calcula a distância para o campus mais próximo (ou município como fallback)
                const universidadesComDistancia = universidadesFiltradas.map(uni => {
                    const distancia = calcularDistanciaParaCampus(userLocation, uni);
                    return distancia !== null ? { ...uni, distancia } : uni;
                });

                universidadesComDistancia.forEach(uni => {
                    resultados.push({ type: 'universidade', data: uni });
                });
            }
        } catch (err) {
            console.error('Erro ao buscar universidades com distância:', err);
            // Fallback: busca sem distância
            const { data: universidades, error } = await supabaseService.getUniversidadesQuery(termo);
            if (!error && universidades) {
                universidades.forEach(uni => {
                    resultados.push({ type: 'universidade', data: uni });
                });
            }
        }
    }

    // Se houve filtro por município, também buscar campi naquele município (inclui campi de universidades sediadas em outras cidades)
    if (filtrosForm && filtrosForm.municipio_codigo) {
        try {
            const { data: todosCampi, error: campiError } = await supabaseService.getCampus();
            if (campiError) {
                console.error('Erro ao buscar campi:', campiError);
            } else if (todosCampi && todosCampi.length > 0) {
                let campiFiltrados = (todosCampi || []).filter(c => String(c?.municipio?.codigo) === String(filtrosForm.municipio_codigo));

                // aplicar filtros acumulados que se referem à universidade associada
                if (filtrosForm.categoria_administrativa) {
                    campiFiltrados = campiFiltrados.filter(c => c.universidade && String(c.universidade.categoria_administrativa) === String(filtrosForm.categoria_administrativa));
                }
                if (filtrosForm.organizacao_academica_codigo) {
                    campiFiltrados = campiFiltrados.filter(c => c.universidade && (String(c.universidade.organizacao_academica?.codigo || c.universidade.organizacao?.codigo || c.universidade.organizacao_academica_codigo) === String(filtrosForm.organizacao_academica_codigo)));
                }
                if (filtrosForm.igc_minimo) {
                    campiFiltrados = campiFiltrados.filter(c => c.universidade && parseFloat(c.universidade.igc || 0) >= parseFloat(filtrosForm.igc_minimo));
                }
                if (filtrosForm.uf_codigo) {
                    campiFiltrados = campiFiltrados.filter(c => String(c?.municipio?.uf?.codigo) === String(filtrosForm.uf_codigo));
                }

                // calcular distância para cada campus (a partir do userLocation se disponível)
                const userLocation = await getUserLocation({ enableHighAccuracy: true, timeout: 10000 }).catch(() => null);
                const campiComDistancia = campiFiltrados.map(c => {
                    let distancia = null;
                    try {
                        if (userLocation && c?.municipio?.latitude && c?.municipio?.longitude) {
                            distancia = haversineDistance(userLocation.latitude, userLocation.longitude, c.municipio.latitude, c.municipio.longitude);
                        }
                    } catch (e) {
                        distancia = null;
                    }
                    return distancia !== null ? { ...c, distancia } : c;
                });

                campiComDistancia.forEach(c => {
                    resultados.push({ type: 'campus', data: c });
                });
            }
        } catch (err) {
            console.error('Erro ao buscar campi por município:', err);
        }
    }

    // busca por áreas
    if (filtrosAtivos.includes('area')) {
        let query = supabaseService.supabase.from("area").select("*");
        if (termo) {
            query = query.ilike('nome', `%${termo}%`);
        }
        const { data: areas, error } = await query;

        if (error) {
            console.error('Erro ao buscar áreas:', error.message);
        } else if (areas && areas.length > 0) {
            areas.forEach(area => {
                resultados.push({ type: 'area', data: area });
            });
        }
    }

    // busca por cursos com suporte a filtros
    if (filtrosAtivos.includes('curso')) {
        try {
            let query;
            if (Object.keys(filtrosForm).length > 0) {
                query = supabaseService.getCursosQueryWithFilters(termo, filtrosForm);
            } else {
                query = supabaseService.supabase
                    .from('curso')
                    .select('codigo, nome, nome_completo, subarea:subarea_codigo (nome, area:area_codigo (nome)), grau:grau_codigo (nome)');

                if (termo && termo.length >= 1) {
                    const pattern = `%${termo}%`;
                    query = query.or(`nome.ilike.${pattern},nome_completo.ilike.${pattern}`);
                }

                query = query.order('nome_completo', { ascending: true }).limit(200);
            }

            const { data: cursos, error } = await query;

            if (error) {
                console.error('Erro ao buscar cursos:', error);
            } else if (cursos && cursos.length > 0) {
                cursos.forEach(curso => {
                    resultados.push({ type: 'curso', data: curso });
                });
            }
        } catch (err) {
            console.error('Erro inesperado ao buscar cursos:', err);
        }
    }
    // Renderiza os resultados, but only up to the current limit (pagination)
    // Cache resultados so the "Carregar mais" button can render more without refetching
    lastResultadosCache = resultados;
    lastSearchTerm = termo;
    lastFiltros = Object.assign({}, filtrosForm);

    // Ensure we start showing first page on a new search
    currentCardLimit = CARDS_PER_PAGE;

    // build visible slice
    const visible = resultados.slice(0, currentCardLimit);
    if (visible.length > 0) {
        visible.forEach(item => {
            if (item.type === 'universidade') {
                html += criarCardUniversidade(item.data);
            } else if (item.type === 'area') {
                html += criarCardArea(item.data);
            } else if (item.type === 'curso') {
                html += criarCardCurso(item.data);
            } else if (item.type === 'campus') {
                html += criarCardCampusBusca(item.data);
            }
        });
    }

    if (!html) {
        html = `<p style="color:#092e5e;font-size:1.2em;">Nenhum resultado encontrado.</p>`;
    }

    // Render cards
    cardsContainer.innerHTML = html;

    // Remove existing load-more wrapper if any
    const existing = document.getElementById('load-more-wrapper');
    if (existing) existing.remove();

    // If there are more results than the current limit, add a "Carregar mais" button
    if (resultados.length > currentCardLimit) {
        const wrapper = document.createElement('div');
        wrapper.id = 'load-more-wrapper';
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = 'center';
        wrapper.style.margin = '12px 0 60px 0';
        wrapper.innerHTML = `<button id="load-more-btn" class="button" style="padding:0 1.5rem;">Carregar mais</button>`;
        // Insert the wrapper after the cards container
        cardsContainer.parentNode.insertBefore(wrapper, cardsContainer.nextSibling);
    }
}

// clicar em "Ver Detalhes" (funciona tanto para uni quanto para curso — verifica presence de data-id e redireciona conforme tipo ativo)
document.addEventListener("click", function (e) {
    if (e.target.closest(".button-content")) {
        const card = e.target.closest(".button-content");
        const id = card.getAttribute("data-id");
        if (!id) return;

        // redireciona conforme tipo ativo (se curso ativo vai para curso.html, se universidade para universidade.html)
        const tipo = filtrosAtivos[0];
        if (tipo === 'universidade') {
            window.location.href = `universidade.html?codigo=${encodeURIComponent(id)}`;
        } else if (tipo === 'curso') {
            window.location.href = `curso.html?codigo=${encodeURIComponent(id)}`;
        } else {
            // fallback: ir para universidade
            window.location.href = `universidade.html?codigo=${encodeURIComponent(id)}`;
        }
    }
});

// Global handler for "Carregar mais" button: increment visible limit and render more cards
document.addEventListener('click', function (e) {
    const loadBtn = e.target.closest('#load-more-btn');
    if (!loadBtn) return;

    // increase visible limit
    currentCardLimit += CARDS_PER_PAGE;

    const cardsContainer = document.getElementById('cards-container');
    if (!cardsContainer) return;

    // Rebuild visible HTML from cached resultados
    const slice = (lastResultadosCache || []).slice(0, currentCardLimit);
    let out = '';
    if (slice.length > 0) {
        slice.forEach(item => {
            if (item.type === 'universidade') out += criarCardUniversidade(item.data);
            else if (item.type === 'area') out += criarCardArea(item.data);
            else if (item.type === 'curso') out += criarCardCurso(item.data);
            else if (item.type === 'campus') out += criarCardCampusBusca(item.data);
        });
    }

    if (!out) out = `<p style="color:#092e5e;font-size:1.2em;">Nenhum resultado encontrado.</p>`;

    cardsContainer.innerHTML = out;

    // update load-more wrapper
    const existing = document.getElementById('load-more-wrapper');
    if (existing) existing.remove();
    if ((lastResultadosCache || []).length > currentCardLimit) {
        const wrapper = document.createElement('div');
        wrapper.id = 'load-more-wrapper';
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = 'center';
        wrapper.style.margin = '12px 0 60px 0';
        wrapper.innerHTML = `<button id="load-more-btn" class="button" style="padding:0 1.5rem;">Carregar mais</button>`;
        cardsContainer.parentNode.insertBefore(wrapper, cardsContainer.nextSibling);
    }
});

// opnCard (mantive como estava; ajuste se usar)
async function opnCard(uniId) {
    // função de exemplo antiga — se usar, adapte para o seu supabaseService
    const { data: universidade, error } = await supabaseService.supabase
        .from("universidade")
        .select(`
            *,
            municipio:municipio_codigo (nome),
            organizacao:organizacao_academica_codigo (descricao),
            uf:uf_codigo (sigla)
        `)
        .eq("codigo", uniId)
        .single();

    if (error) {
        console.error("Erro ao buscar detalhes da universidade:", error);
        return;
    }

    const container = document.getElementById("card-detalhe");
    if (container) {
        container.innerHTML = `
        <div class="card-expanded">
            <div class="card-info-expanded">
                <div class="card-header-expanded">
                    <span class="card-nome">${universidade.sigla || ''}</span>
                    <span class="card-nomecompleto">${universidade.nome || ''}</span>
                </div>
                <div class="card-dados-expanded">
                    <span class="card-org"><b>Organização:</b> ${universidade.organizacao?.descricao || '-'}</span>
                    <span class="card-cat"><b>Categoria:</b> ${universidade.categoria_administrativa || '-'}</span>
                    <span class="card-local"><b>Município:</b> ${universidade.municipio?.nome || '-'}</span>
                </div>
            </div>
        </div>
    `;
    }
}

//________________________________________________________________________
//Funções para icone de avatar header

function initializeAvatarDropdown() {
    const header = document.getElementById('header');
    if (!header) return;

    const avatar = document.getElementById('usuario');
    if (!avatar) return;

    let avatarWrapper = avatar.parentElement;
    if (!avatarWrapper) return;
    avatarWrapper.style.position = 'relative';

    const arrow = document.createElement('div');
    arrow.className = 'avatar-arrow';
    avatarWrapper.appendChild(arrow);

    const dropdown = document.createElement('div');
    dropdown.id = 'avatar-dropdown';
    dropdown.innerHTML = `
    <a href="conta.html" class="avatar-item">Conta</a>
    <a href="editar.html" class="avatar-item">Editar informações</a>
    <a href="#" id="avatar-logout" class="avatar-item">Sair</a>
  `;

    avatarWrapper.appendChild(dropdown);

    document.getElementById("usuario").addEventListener('mouseenter', () => {
        arrow.classList.add('show');
    });

    avatarWrapper.addEventListener('mouseleave', () => {
        if (!dropdown.classList.contains('show')) {
            arrow.classList.remove('show');
        }
    });

    avatar.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
        arrow.classList.add('show');
    });
    arrow.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
        arrow.classList.add('show');
    });

    document.addEventListener('click', (e) => {
        if (!avatarWrapper.contains(e.target)) {
            dropdown.classList.remove('show');
            arrow.classList.remove('show');
        }
    });

    const logoutBtn = document.getElementById('avatar-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const supabaseService = new SupabaseService();
            await supabaseService.supabase.auth.signOut();
            window.location.href = 'login.html';
        });
    }
    document.getElementById("logopequena").addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = 'inicio.html';

    });
    document.getElementById("titulo").addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = 'index.html';
        
    });
}



