import { SupabaseService } from './supabase.js';

// Instancia o serviço de comunicação com o Supabase
const supabaseService = new SupabaseService();

// Adiciona o método customizado à instância do serviço para buscar cursos de um campus
supabaseService.getCursosByCampus = async function (campusCodigo) {
    // Primeiro, busca as relações (links) entre o campus e os cursos na tabela 'campus_has_curso'
    const { data: links, error: linksError } = await this.supabase
        .from('campus_has_curso')
        .select('curso_codigo')
        .eq('campus_codigo', campusCodigo);

    if (linksError) return { data: null, error: linksError };
    if (!links || links.length === 0) return { data: [], error: null };

    // Extrai os IDs dos cursos, removendo duplicatas com Set
    const cursoIds = Array.from(new Set(links.map(l => l.curso_codigo)));

    // Em seguida, busca os detalhes completos dos cursos usando os IDs encontrados
    return this.supabase
        .from('curso')
        .select('*, subarea:subarea_codigo (nome, area:area_codigo (nome)), grau:grau_codigo (nome)')
        .in('codigo', cursoIds);
};

// --- FUNÇÕES DE CRIAÇÃO DE HTML (TEMPLATES) ---

/**
 * Cria o HTML para o card de detalhes de um campus.
 * @param {object} campus - O objeto com os dados do campus.
 * @returns {string} O HTML do card do campus.
 */
function criarCardCampus(campus) {
    const nomeCampus = campus?.nome?.includes(" - ") ? campus.nome.split(" - ")[1] : campus?.nome;
    return `
    <div class="cardcampus" data-id="${campus?.codigo}">
      <div id="topoCardCampus">
        <div id="iconeCardCampus"><i class="fa-solid fa-building"></i></div>
        <div id="infoCampus">
        <div id="nomeCampus">
            <div><h1>${nomeCampus || 'Nome do campus'}</h1></div>
            <div id="nomeUni">${campus?.universidade?.nome || '-'}</div>
        </div>
            <div id="stars">
                <div class="rating">
                    <input value="5" name="rate" id="star5" type="radio">
                    <label title="text" for="star5"></label>
                    <input value="4" name="rate" id="star4" type="radio">
                    <label title="text" for="star4"></label>
                    <input value="3" name="rate" id="star3" type="radio" checked="">
                    <label title="text" for="star3"></label>
                    <input value="2" name="rate" id="star2" type="radio">
                    <label title="text" for="star2"></label>
                    <input value="1" name="rate" id="star1" type="radio">
                    <label title="text" for="star1"></label>
                </div>
                <div>
                    <p id="avaliacaomedia">4.6</p>
                </div>
                <button class="button">
                    <span class="button-content">Avaliar </span>
                </button>
            </div>
        </div>
      </div>
      <div id="detalhesCardCampus">
        <div id="localCampus">
            <i id="icone" class="fa-solid fa-location-dot"></i>
            <div class="colunaDadosCampus">
                <span class="subtitulo">Localização:</span>
                <span class="dadoCampus">${campus?.municipio?.nome || '-'}</span>
            </div>
        </div>
        <div id="localCampus">
            <i id="icone" class="fa-solid fa-map-location-dot"></i>
            <div class="colunaDadosCampus">
                <span class="subtitulo">Endereço:</span>
                <span class="dadoCampus">Rua Botucatu, 740</span>
            </div>
        </div>
        <div id="localCampus">
            <i id="icone" class="fa-solid fa-medal"></i>
            <div class="colunaDadosCampus">
                <span class="subtitulo">Nota IGC:</span>
                <span class="dadoCampus">Conceito 5</span>
            </div>
        </div>
        <div id="localCampus">
            <i id="icone" class="fa-solid fa-user"></i>
            <div class="colunaDadosCampus">
                <span class="subtitulo">Estudantes:</span>
                <span class="dadoCampus">1.200</span>
            </div>
        </div>
      </div>
    </div>
  `;
}



function criarCardCurso(curso) {
    const areaNome = curso?.subarea?.area?.nome || '';
    const subareaNome = curso?.subarea?.nome || '';
    const grauNome = curso?.grau?.nome || '';

    // Pega a descrição e o turno do objeto curso, com um valor padrão caso não exista.
    const descricao = curso?.descricao || 'Descrição não disponível.';
    const turno = curso?.turno || 'Informação de turno não disponível.';

    return `
        <div class="cardcurso" data-id="${curso?.codigo}" id="cardcurso">
            <div class="cardcurso-header">
                <div class="cardcurso-title">${curso?.nome || curso?.nome_completo || 'Nome do Curso'}</div>
                <div class="cardcurso-bookmark"><i class="fa-solid fa-graduation-cap"></i></div>
            </div>
            <div class="cardcurso-body">
                ${areaNome ? `<div class="cardcurso-row"><span class="cardcurso-label">Área:</span> <span class="cardcurso-value">${areaNome}</span></div>` : ''}
                ${subareaNome ? `<div class="cardcurso-row"><span class="cardcurso-label">Subárea:</span> <span class="cardcurso-value">${subareaNome}</span></div>` : ''}
                
                <!-- ALTERAÇÃO: Adicionando a nova linha para a descrição -->
                <div class="cardcurso-row">
                    <span class="cardcurso-label">Descrição:</span> 
                    <span class="cardcurso-value">${descricao}</span>
                </div>

                <!-- ALTERAÇÃO: Adicionando a nova linha para o turno -->
                <div class="cardcurso-row">
                    <span class="cardcurso-label">Turno:</span> 
                    <span class="cardcurso-value">${turno}</span>
                </div>

                <div class="cardcurso-tags">
                    ${grauNome ? `<span class="tag tag-grau">${grauNome}</span>` : ''}
                </div>
            </div>
        </div>

    `;
}

/**
 * Cria o HTML para a seção de infraestrutura.
 * @returns {string} O HTML da seção de infraestrutura.
 */
function criarCardInfraestrutura() {
    return `
    <div id="containerInfraestrutura">
        <div class="cardInfraestrutura">
            <div class="iconeInfra"><i class="fa-solid fa-book"></i></div>
             <div class="tituloCardInfra"><span>Biblioteca</span></div>
              <div class="infoCardInfra"><span>Acervo com mais de 50 mil livros</span></div>
        </div>
        <div class="cardInfraestrutura">
            <div class="iconeInfra"><i class="fa-solid fa-computer"></i></div>
             <div class="tituloCardInfra"><span>Laboratórios</span></div>
              <div class="infoCardInfra"><span>15 laboratórios modernos</span></div>
        </div>
        <div class="cardInfraestrutura">
            <div class="iconeInfra"><i class="fa-solid fa-wifi"></i></div>
             <div class="tituloCardInfra"><span>Wi-Fi</span></div>
              <div class="infoCardInfra"><span>Internet de alta velocidade</span></div>
        </div>
        <div class="cardInfraestrutura">
            <div class="iconeInfra"><i class="fa-solid fa-magnifying-glass"></i></div>
             <div class="tituloCardInfra"><span>Projetos de Pesquisa</span></div>
              <div class="infoCardInfra"><span>Mais de 20 projetos de pesquisa</span></div>
        </div>
    </div>
    `;
}


// --- LÓGICA PRINCIPAL DA PÁGINA ---

/**
 * Função principal para renderizar os dados do campus e do curso específico.
 * @param {string} campusCodigo - O código do campus.
 * @param {string} cursoCodigo - O código do curso a ser exibido.
 */
async function renderCampus(campusCodigo, cursoCodigo) {
    const container = document.getElementById('card-detalhe');
    if (!container) {
        console.error("Container com ID 'card-detalhe' não encontrado.");
        return;
    }

    container.innerHTML = '<p style="color:#092e5e;font-size:1.2em;">Carregando...</p>';

    try {
        const { data: campus, error } = await supabaseService.supabase
            .from('campus')
            .select('*, universidade(nome), municipio(nome)')
            .eq('codigo', campusCodigo)
            .single();

        if (error) {
            console.error('Erro ao buscar campus:', error);
            container.innerHTML = `<p style="color:#c0392b;">Erro ao carregar campus: ${error.message}</p>`;
            return;
        }

        if (!campus) {
            container.innerHTML = `<p style="color:#092e5e;">Campus não encontrado.</p>`;
            return;
        }

        container.innerHTML += `<div id="divcampusTitulo"><h4 id="campustitulo">Detalhes do Curso</h4><p id="campusSubtitulo">Informações sobre o curso selecionado:</p></div>`;


        const { data: todosCursos, error: cursosError } = await supabaseService.getCursosByCampus(campusCodigo);

        if (cursosError) {
            console.error('Erro ao buscar cursos:', cursosError);
            container.innerHTML += `<p style="color:#c0392b;">Erro ao carregar os cursos: ${cursosError.message}</p>`;
            return;
        }

        if (!todosCursos || todosCursos.length === 0) {
            container.innerHTML += `<p style="color:#092e5e;">Nenhum curso encontrado para este campus.</p>`;
            return;
        }

        const curso = todosCursos.find(c => c.codigo == cursoCodigo);

        if (!curso) {
            container.innerHTML += `<p style="color:#c0392b;">Curso com código ${cursoCodigo} não encontrado neste campus.</p>`;
            return;
        }

        container.innerHTML = criarCardCurso(curso);

        container.innerHTML += criarCardCampus(campus);
        container.innerHTML += `<div id="divcampusTitulo"><h4 id="campustitulo">Infraestrutura</h4><p id="campusSubtitulo">Conheça as facilidades disponíveis:</p></div>`;
        container.innerHTML += criarCardInfraestrutura();




    } catch (err) {
        console.error('Erro inesperado:', err);
        container.innerHTML = `<p style="color:#c0392b;">Ocorreu um erro inesperado. Tente novamente mais tarde.</p>`;
    }
}

// --- EVENT LISTENERS E INICIALIZAÇÃO ---

/**
 * Obtém um parâmetro específico da URL da página.
 * @param {string} param - O nome do parâmetro a ser buscado.
 * @returns {string|null} O valor do parâmetro ou null se não encontrado.
 */
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Event listener para cliques nos cards de curso (para navegação futura, se necessário)
document.addEventListener("click", function (e) {
    if (e.target.closest(".cardcurso")) {
        const card = e.target.closest(".cardcurso");
        const cursoId = card.getAttribute("data-id");
        // Este trecho pode ser útil se você tiver uma lista de cursos em outra página
        // Para a página de detalhes, ele pode não ser necessário, mas é mantido para consistência.
        const campusId = getQueryParam('campus'); // Pega o campus da URL atual

        if (cursoId && campusId) {
            // Evita recarregar a página se já estiver na página do curso
            if (cursoId !== getQueryParam('curso')) {
                window.location.href = `cursoCampus.html?campus=${encodeURIComponent(campusId)}&curso=${encodeURIComponent(cursoId)}`;
            }
        }
    }
});

// Espera o DOM estar completamente carregado para executar a lógica principal
document.addEventListener('DOMContentLoaded', () => {
    const campusCodigo = getQueryParam('campus');
    const cursoCodigo = getQueryParam('curso');

    if (campusCodigo && cursoCodigo) {
        // Chama a função principal com ambos os parâmetros da URL
        renderCampus(campusCodigo, cursoCodigo);
    } else {
        const container = document.getElementById('card-detalhe');
        if (container) {
            container.innerHTML = '<p style="color:#c0392b;">Código do campus ou do curso não fornecido na URL.</p>';
        }
        console.error("Parâmetros 'campus' e 'curso' não encontrados na URL.");
    }
});